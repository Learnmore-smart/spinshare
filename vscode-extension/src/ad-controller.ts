import type { AdResponse, AdResponseAvailable, TrackResponse } from "@spinshare/core";

const VIEWABILITY_MIN_MS = 3_000;

/**
 * Ad controller for the SpinShare VSCode extension.
 *
 * Drives the ad lifecycle around an AI generation operation:
 *   1. On generation start: fetch an ad (`GET /api/ad`).
 *   2. If an ad is available: show its text in a bottom-right progress
 *      notification via `vscode.window.withProgress({ location:
 *      ProgressLocation.Notification })`, then report **exactly one**
 *      impression only after it remains visible for 3 seconds.
 *   3. On generation complete: resolve the progress task so the notification is
 *      dismissed within 1 second.
 *
 * The `vscode` namespace and the API client are **injected** so the controller
 * is fully testable with mocks — task 14.4's property test ("one impression per
 * generation") drives this class against a mocked `vscode` API and a stub
 * client. Only the stable `vscode` surface is used (VSCode/Trae/Cursor safe).
 *
 * Requirements:
 *   - 6.1 — show the current ad text in a bottom-right progress notification
 *     while generation is in progress.
 *   - 6.2 — dismiss the notification when generation completes.
 *   - 6.3 — request the ad from `GET /api/ad` and report exactly one impression
 *     to `POST /api/track` per generation.
 */

// ---------------------------------------------------------------------------
// Injected dependency shapes (minimal stable `vscode` subset)
// ---------------------------------------------------------------------------

/** Progress reporter passed to a `withProgress` task. */
export interface ProgressLike {
  report(value: { message?: string; increment?: number }): void;
}

/** Cancellation token passed to a `withProgress` task (unused but kept for parity). */
export interface CancellationTokenLike {
  isCancellationRequested: boolean;
}

/** Options accepted by `window.withProgress`. */
export interface ProgressOptionsLike {
  location: number | { viewId: string };
  title?: string;
  cancellable?: boolean;
}

/** The `vscode.window` subset this controller depends on. */
export interface WindowLike {
  withProgress<R>(
    options: ProgressOptionsLike,
    task: (
      progress: ProgressLike,
      token: CancellationTokenLike,
    ) => Thenable<R>,
  ): Thenable<R>;
  /**
   * Optional: show a dismissible information message with action buttons,
   * resolving to the chosen item's label (or `undefined`). Used to surface a
   * clickable "Open" CTA for ads carrying a click-through URL. Optional so
   * test doubles need not implement it.
   */
  showInformationMessage?(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined>;
}

/** The `vscode` namespace subset this controller depends on. */
export interface VsCodeLike {
  window: WindowLike;
  /** Enum providing at least `Notification`. Mirrors `vscode.ProgressLocation`. */
  ProgressLocation: { Notification: number };
}

/** The API client surface the controller needs (see {@link AdApiClient}). */
export interface AdClientLike {
  getAd(token?: string): Promise<AdResponse>;
  reportImpression(
    campaignId: string,
    viewDurationMs: number,
    token?: string,
  ): Promise<TrackResponse | null>;
}

/** Construction dependencies for {@link AdController}. */
export interface AdControllerDeps {
  /** Injected `vscode` namespace subset. */
  vscode: VsCodeLike;
  /** Injected API client. */
  client: AdClientLike;
  /** Supplies the current bearer token, or `undefined` when unauthenticated. */
  getToken?: () => string | undefined;
  /** Optional sink for non-fatal errors (e.g. logging). */
  onError?: (error: unknown) => void;
  /**
   * Optional sink that opens an external URL (the ad's click-through). Wired in
   * the extension to `vscode.env.openExternal(vscode.Uri.parse(url))`. When
   * absent, ads are shown but not clickable.
   */
  openUrl?: (url: string) => void;
}

// ---------------------------------------------------------------------------
// Active-generation bookkeeping
// ---------------------------------------------------------------------------

interface ActiveGeneration {
  /** Resolves the `withProgress` task, dismissing the notification. */
  finish: () => void;
  /** Pending 3-second viewability timer. */
  reportTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Coordinates ad display and impression reporting for one generation at a time.
 *
 * Concurrency model: a single generation is active at any moment. Calling
 * {@link startGeneration} while one is active is a no-op (it neither starts a
 * second notification nor reports a second impression), which guarantees the
 * "exactly one impression per generation" invariant even under sloppy host
 * event sequences.
 */
export class AdController {
  private readonly vscode: VsCodeLike;
  private readonly client: AdClientLike;
  private readonly getToken: () => string | undefined;
  private readonly onError: (error: unknown) => void;
  private readonly openUrl: (url: string) => void;

  private active: ActiveGeneration | null = null;
  /** Guards against overlapping start calls while an ad fetch is in flight. */
  private starting = false;

  constructor(deps: AdControllerDeps) {
    this.vscode = deps.vscode;
    this.client = deps.client;
    this.getToken = deps.getToken ?? (() => undefined);
    this.onError = deps.onError ?? (() => {});
    this.openUrl = deps.openUrl ?? (() => {});
  }

  /** True while a generation's notification is showing. */
  get isActive(): boolean {
    return this.active !== null;
  }

  /**
   * Begin a generation: fetch an ad, show it in a notification, and schedule
   * exactly one impression after the 3-second minimum view time.
   *
   * Idempotent while a generation is active or starting — repeat calls return
   * immediately without showing another notification or reporting another
   * impression. When no ad is available, nothing is shown and **no impression
   * is reported** (Requirement 6.3 only reports when an ad is displayed).
   */
  async startGeneration(): Promise<void> {
    if (this.active !== null || this.starting) {
      return;
    }
    this.starting = true;
    try {
      const token = this.getToken();
      const ad = await this.client.getAd(token);
      if (!ad.adAvailable) {
        // No ad → no notification, no impression. Graceful no-op.
        return;
      }

      // Hold the progress task pending until generation completes. Resolving
      // `finish` dismisses the notification (within 1s of completion since we
      // resolve synchronously on completeGeneration).
      let finish!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const active: ActiveGeneration = { finish, reportTimer: null };
      active.reportTimer = setTimeout(() => {
        if (this.active !== active) {
          return;
        }
        active.reportTimer = null;
        void this.reportOnce(ad.campaignId, VIEWABILITY_MIN_MS, token);
      }, VIEWABILITY_MIN_MS);
      this.active = active;

      // Show the ad text in a bottom-right progress notification. We do not
      // await this promise here — it stays pending and resolves when the
      // generation completes.
      void this.showProgress(ad.adText, pending);
      // If the ad has a click-through URL, surface a clickable "Open" action.
      this.maybeShowClickThrough(ad);

    } catch (error) {
      this.onError(error);
    } finally {
      this.starting = false;
    }
  }

  /**
   * Complete the current generation: resolve the progress task so the
   * notification is dismissed within 1 second. No-op when no generation is
   * active.
   */
  completeGeneration(): void {
    const current = this.active;
    if (current === null) {
      return;
    }
    this.active = null;
    if (current.reportTimer !== null) {
      clearTimeout(current.reportTimer);
    }
    current.finish();
  }

  /**
   * Dispose the controller, dismissing any active notification. Safe to call
   * multiple times.
   */
  dispose(): void {
    this.completeGeneration();
  }

  /**
   * When the displayed ad carries a click-through URL, surface a dismissible
   * "Open" action so the developer can click the ad. Fire-and-forget and fully
   * optional: it no-ops unless the host provides `showInformationMessage`, so
   * the core progress flow (and its property test) is unaffected.
   */
  private maybeShowClickThrough(ad: AdResponseAvailable): void {
    const url = ad.destinationUrl;
    const show = this.vscode.window.showInformationMessage;
    if (!url || url.length === 0 || typeof show !== "function") {
      return;
    }
    const label = ad.brandName ? `Open ${ad.brandName}` : "Open";
    void Promise.resolve(show.call(this.vscode.window, ad.adText, label)).then(
      (choice) => {
        if (choice === label) {
          this.openUrl(url);
        }
      },
      (error) => this.onError(error),
    );
  }

  private showProgress(adText: string, pending: Promise<void>): Thenable<void> {    return this.vscode.window.withProgress<void>(
      {
        location: this.vscode.ProgressLocation.Notification,
        title: adText,
        cancellable: false,
      },
      () => pending,
    );
  }

  private async reportOnce(
    campaignId: string,
    viewDurationMs: number,
    token: string | undefined,
  ): Promise<void> {
    try {
      await this.client.reportImpression(campaignId, viewDurationMs, token);
    } catch (error) {
      // A failed report must not crash the editor or the generation flow.
      this.onError(error);
    }
  }
}
