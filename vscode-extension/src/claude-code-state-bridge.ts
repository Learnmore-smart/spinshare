import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

const DEFAULT_ACTIVE_STATE_TTL_MS = 120_000;
const DEFAULT_BRIDGE_DISPLAY_TTL_MS = 8_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const OPEN_COMMAND = "spinshare.openClaudeCodeAd";
const MAX_STATUS_AD_TEXT_LENGTH = 72;

interface DisposableLike {
  dispose(): void;
}

interface StatusBarItemLike extends DisposableLike {
  text: string;
  tooltip?: unknown;
  command?: unknown;
  show(): void;
  hide(): void;
}

interface StatusBarWindowLike {
  createStatusBarItem(alignment?: unknown, priority?: number): StatusBarItemLike;
}

interface CommandsLike {
  registerCommand(command: string, callback: () => void): DisposableLike;
}

export interface ClaudeCodeStateBridgeVscodeLike {
  window: StatusBarWindowLike;
  commands: CommandsLike;
  StatusBarAlignment?: { Right?: unknown };
}

export interface ClaudeCodeAdState {
  key: string;
  campaignId: string | undefined;
  adText: string;
  destinationUrl: string | undefined;
  brandName: string | undefined;
  startedAtMs: number | undefined;
  expiresAtMs: number | undefined;
}

export interface ClaudeCodeStateBridgeOptions {
  vscode: ClaudeCodeStateBridgeVscodeLike;
  stateFilePath: string;
  pollIntervalMs?: number;
  maxDisplayDurationMs?: number;
  openUrl?: (url: string) => void;
  onError?: (error: unknown) => void;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function isFreshState(
  startedAtMs: number | undefined,
  expiresAtMs: number | undefined,
  nowMs: number,
  maxDisplayDurationMs: number,
): boolean {
  if (typeof expiresAtMs === "number" && expiresAtMs <= nowMs) {
    return false;
  }
  if (typeof startedAtMs !== "number") {
    return true;
  }
  const elapsedMs = nowMs - startedAtMs;
  const cappedTtlMs = Math.min(
    DEFAULT_ACTIVE_STATE_TTL_MS,
    Math.max(1, maxDisplayDurationMs),
  );
  return elapsedMs <= cappedTtlMs;
}

function stateKey(state: {
  campaignId: string | undefined;
  adText: string;
  startedAtMs: number | undefined;
}): string {
  return `${state.campaignId ?? ""}:${state.startedAtMs ?? ""}:${state.adText}`;
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

export function readClaudeCodeAdState(
  raw: string,
  nowMs: number = Date.now(),
  maxDisplayDurationMs: number = DEFAULT_BRIDGE_DISPLAY_TTL_MS,
): ClaudeCodeAdState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const state = parsed as Record<string, unknown>;
  if (state.active !== true) {
    return null;
  }

  const adText = optionalString(state.adText);
  if (!adText) {
    return null;
  }

  const startedAtMs = optionalNumber(state.startedAtMs);
  const expiresAtMs = optionalNumber(state.expiresAtMs);
  if (!isFreshState(startedAtMs, expiresAtMs, nowMs, maxDisplayDurationMs)) {
    return null;
  }

  const adState = {
    campaignId: optionalString(state.campaignId),
    adText,
    destinationUrl: optionalString(state.destinationUrl),
    brandName: optionalString(state.brandName),
    startedAtMs,
    expiresAtMs,
  };

  return {
    ...adState,
    key: stateKey(adState),
  };
}

export class ClaudeCodeStateBridge {
  private readonly vscode: ClaudeCodeStateBridgeVscodeLike;
  private readonly stateFilePath: string;
  private readonly pollIntervalMs: number;
  private readonly maxDisplayDurationMs: number;
  private readonly openUrl: (url: string) => void;
  private readonly onError: (error: unknown) => void;
  private readonly statusBarItem: StatusBarItemLike;
  private readonly openCommandDisposable: DisposableLike;

  private watcher: fs.FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private activeKey: string | null = null;
  private activeUrl: string | null = null;
  private visible = false;
  private disposed = false;

  constructor(options: ClaudeCodeStateBridgeOptions) {
    this.vscode = options.vscode;
    this.stateFilePath = options.stateFilePath;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxDisplayDurationMs =
      options.maxDisplayDurationMs ?? DEFAULT_BRIDGE_DISPLAY_TTL_MS;
    this.openUrl = options.openUrl ?? (() => {});
    this.onError = options.onError ?? (() => {});
    this.statusBarItem = this.vscode.window.createStatusBarItem(
      this.vscode.StatusBarAlignment?.Right,
      98,
    );
    this.openCommandDisposable = this.vscode.commands.registerCommand(
      OPEN_COMMAND,
      () => {
        if (this.activeUrl) {
          this.openUrl(this.activeUrl);
        }
      },
    );
  }

  start(): void {
    if (this.disposed || this.pollTimer !== null || this.watcher !== null) {
      return;
    }
    void this.installWatcher();
    void this.refreshFromDisk();
    this.pollTimer = setInterval(() => {
      void this.refreshFromDisk();
    }, this.pollIntervalMs);
  }

  dispose(): void {
    this.disposed = true;
    if (this.watcher !== null) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.clearActive();
    this.statusBarItem.dispose();
    this.openCommandDisposable.dispose();
  }

  async refreshFromDisk(): Promise<void> {
    if (this.disposed) {
      return;
    }

    let state: ClaudeCodeAdState | null = null;
    try {
      const raw = await fsp.readFile(this.stateFilePath, "utf8");
      state = readClaudeCodeAdState(
        raw,
        Date.now(),
        this.maxDisplayDurationMs,
      );
    } catch (error) {
      if (!isNotFoundError(error)) {
        this.onError(error);
      }
    }

    this.applyState(state);
  }

  private async installWatcher(): Promise<void> {
    try {
      const dir = path.dirname(this.stateFilePath);
      const basename = path.basename(this.stateFilePath);
      await fsp.mkdir(dir, { recursive: true });
      if (this.disposed || this.watcher !== null) {
        return;
      }
      this.watcher = fs.watch(dir, (_eventType, fileName) => {
        if (
          fileName === null ||
          fileName === undefined ||
          fileName.toString() === basename
        ) {
          void this.refreshFromDisk();
        }
      });
      this.watcher.on("error", (error) => this.onError(error));
    } catch (error) {
      this.onError(error);
    }
  }

  private applyState(state: ClaudeCodeAdState | null): void {
    if (state === null) {
      this.clearActive();
      return;
    }

    if (state.key === this.activeKey) {
      return;
    }

    this.activeKey = state.key;
    this.activeUrl = state.destinationUrl ?? null;
    this.statusBarItem.text = formatStatusText(state);
    this.statusBarItem.tooltip = formatTooltip(state);
    this.statusBarItem.command = state.destinationUrl ? OPEN_COMMAND : undefined;
    this.statusBarItem.show();
    this.visible = true;
  }

  private clearActive(): void {
    this.activeKey = null;
    this.activeUrl = null;
    this.statusBarItem.command = undefined;
    if (this.visible) {
      this.statusBarItem.hide();
      this.visible = false;
    }
  }
}

function truncateStatusText(value: string): string {
  if (value.length <= MAX_STATUS_AD_TEXT_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_STATUS_AD_TEXT_LENGTH - 3)}...`;
}

function formatStatusText(state: ClaudeCodeAdState): string {
  const icon = state.destinationUrl ? "$(link-external)" : "$(info)";
  return `${icon} SpinShare: ${truncateStatusText(state.adText)}`;
}

function formatTooltip(state: ClaudeCodeAdState): string {
  const source = state.brandName ? `Source: ${state.brandName}` : "Source: SpinShare";
  if (state.destinationUrl) {
    return `${state.adText}\n${source}\nClick to open.`;
  }
  return `${state.adText}\n${source}`;
}
