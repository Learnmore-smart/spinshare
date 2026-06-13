import type { AdResponse, TrackResponse } from "@spinshare/core";

/**
 * Ad controller for the SpinShare VSCode extension.
 *
 * Drives the ad lifecycle around an AI generation operation:
 *   1. On generation start: fetch an ad (`GET /api/ad`).
 *   2. If an ad is available: show its text in a bottom-right progress
 *      notification via `vscode.window.withProgress({ location:
 *      ProgressLocation.Notification })`, and report **exactly one** impression
 *      (`POST /api/track`).
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
}

// ---------------------------------------------------------------------------
// Active-generation bookkeeping
// ---------------------------------------------------------------------------

interface ActiveGeneration {
  /** Resolves the `withProgress` task, dismissing the notification. */
  finish: () => void;
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

  private active: ActiveGeneration | null = null;
  /** Guards against overlapping start calls while an ad fetch is in flight. */
  private starting = false;

  constructor(deps: AdControllerDeps) {
    this.vscode = deps.vscode;
    this.client = deps.client;
    this.getToken = deps.getToken ?? (() => undefined);
    this.onError = deps.onError ?? (() => {});
  }

  /** True while a generation's notification is showing. */
  get isActive(): boolean {
    return this.active !== null;
  }

  /**
   * Begin a generation: fetch an ad, show it in a notification, and report
   * exactly one impression.
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
      this.active = { finish };

      // Show the ad text in a bottom-right progress notification. We do not
      // await this promise here — it stays pending and resolves when the
      // generation completes.
      void this.showProgress(ad.adText, pending);

      // Report exactly one impression for this generation.
      await this.reportOnce(ad.campaignId, token);
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
    current.finish();
  }

  /**
   * Dispose the controller, dismissing any active notification. Safe to call
   * multiple times.
   */
  dispose(): void {
    this.completeGeneration();
  }

  private showProgress(adText: string, pending: Promise<void>): Thenable<void> {
    return this.vscode.window.withProgress<void>(
      {
        location: this.vscode.ProgressLocation.Notification,
        title: adText,
        cancellable: false,
      },
      () => pending,
    );
  }

  private async reportOnce(campaignId: string, token: string | undefined): Promise<void> {
    try {
      await this.client.reportImpression(campaignId, token);
    } catch (error) {
      // A failed report must not crash the editor or the generation flow.
      this.onError(error);
    }
  }
}
