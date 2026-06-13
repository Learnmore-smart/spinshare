import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  AdController,
  type VsCodeLike,
  type AdClientLike,
} from "./ad-controller";
import type { AdResponse, TrackResponse } from "@spinshare/core";

/**
 * Feature: spinshare-ad-exchange, Property 24: One impression per generation —
 * Validates: Requirements 6.3.
 *
 * The VSCode extension must request the ad from `GET /api/ad` and report
 * **exactly one** impression to `POST /api/track` per generation that displays
 * an ad. Concretely, across an arbitrary lifecycle of start/complete signals
 * (including duplicate starts, overlapping starts, and starts with no
 * completes):
 *
 *   - Every generation that fetched an *available* ad reports exactly one
 *     impression (one per displayed ad — no campaign id repeats).
 *   - Duplicate/overlapping `startGeneration` calls while a generation is
 *     active never produce a second impression.
 *   - When no ad is available (`adAvailable === false`), zero impressions are
 *     reported and no notification is shown.
 *
 * The controller is idempotent while active/starting and we `await` each
 * `startGeneration`, so the run is fully deterministic: the controller's calls
 * to `getAd` happen in a fixed order, letting us mirror its exact behaviour in
 * a reference model and assert the observed impression count equals the model.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

interface ProgressCall {
  title?: string;
  dismissed: boolean;
}

/** Mock `vscode` whose `withProgress` runs the task and resolves with it. */
function makeMockVscode(): { vscode: VsCodeLike; progressCalls: ProgressCall[] } {
  const progressCalls: ProgressCall[] = [];
  const vscode: VsCodeLike = {
    ProgressLocation: { Notification: 15 },
    window: {
      withProgress<R>(
        options: { title?: string; location: number | { viewId: string } },
        task: (
          progress: { report: (v: unknown) => void },
          token: { isCancellationRequested: boolean },
        ) => Thenable<R>,
      ): Thenable<R> {
        const call: ProgressCall = { title: options.title, dismissed: false };
        progressCalls.push(call);
        const result = task(
          { report: () => {} },
          { isCancellationRequested: false },
        );
        return Promise.resolve(result).then((value) => {
          call.dismissed = true;
          return value;
        });
      },
    },
  };
  return { vscode, progressCalls };
}

const TRACK: TrackResponse = {
  recorded: true,
  developerCreditCents: 18,
  developerCreditUsd: "0.18",
};

/**
 * Stub client whose `getAd` returns availability from `availability` in call
 * order (defaulting to `true` once exhausted), producing a unique campaign id
 * per available ad so repeated impressions for a single generation are
 * detectable as duplicate ids. `impressions` records every reportImpression
 * campaign id, in order.
 */
function makeMockClient(availability: ReadonlyArray<boolean>): {
  client: AdClientLike;
  impressions: string[];
  adCalls: () => number;
} {
  const impressions: string[] = [];
  let adCallIndex = 0;
  const client: AdClientLike = {
    getAd: async (): Promise<AdResponse> => {
      const available =
        adCallIndex < availability.length ? availability[adCallIndex] : true;
      adCallIndex += 1;
      if (available) {
        return {
          adAvailable: true,
          campaignId: `cmp_${adCallIndex}`,
          adText: `Ad #${adCallIndex}`,
          cpmCents: 3000,
          cpmUsd: "30.00",
        };
      }
      return { adAvailable: false };
    },
    reportImpression: async (campaignId: string) => {
      impressions.push(campaignId);
      return TRACK;
    },
  };
  return { client, impressions, adCalls: () => adCallIndex };
}

// ---------------------------------------------------------------------------
// Reference model — mirrors AdController exactly when starts are awaited.
// ---------------------------------------------------------------------------

type Op = "start" | "complete";

/**
 * Compute the number of impressions AdController will report for `ops` given
 * the per-`getAd`-call `availability`. `getAd` is invoked only when not active,
 * so model and controller consume `availability` in the same order.
 */
function expectedImpressions(
  ops: ReadonlyArray<Op>,
  availability: ReadonlyArray<boolean>,
): number {
  let active = false;
  let adIndex = 0;
  let impressions = 0;
  for (const op of ops) {
    if (op === "start") {
      if (active) continue; // idempotent while active
      const available =
        adIndex < availability.length ? availability[adIndex] : true;
      adIndex += 1;
      if (available) {
        impressions += 1;
        active = true;
      }
    } else {
      active = false; // no-op when not active
    }
  }
  return impressions;
}

function finalActive(
  ops: ReadonlyArray<Op>,
  availability: ReadonlyArray<boolean>,
): boolean {
  let active = false;
  let adIndex = 0;
  for (const op of ops) {
    if (op === "start") {
      if (active) continue;
      const available =
        adIndex < availability.length ? availability[adIndex] : true;
      adIndex += 1;
      if (available) active = true;
    } else {
      active = false;
    }
  }
  return active;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const opArb: fc.Arbitrary<Op> = fc.constantFrom<Op>("start", "complete");
const opsArb: fc.Arbitrary<Op[]> = fc.array(opArb, { maxLength: 40 });
const availabilityArb: fc.Arbitrary<boolean[]> = fc.array(fc.boolean(), {
  maxLength: 40,
});

describe("Property 24: one impression per generation", () => {
  it("reports exactly one impression per displayed ad across arbitrary lifecycles", async () => {
    await fc.assert(
      fc.asyncProperty(opsArb, availabilityArb, async (ops, availability) => {
        const { vscode, progressCalls } = makeMockVscode();
        const { client, impressions } = makeMockClient(availability);
        const controller = new AdController({ vscode, client });

        for (const op of ops) {
          if (op === "start") {
            await controller.startGeneration();
          } else {
            controller.completeGeneration();
          }
        }

        const expected = expectedImpressions(ops, availability);

        // Exactly one impression per generation that displayed an ad.
        expect(impressions).toHaveLength(expected);
        // One notification shown per impression (every displayed ad).
        expect(progressCalls).toHaveLength(expected);
        // No campaign id repeats → never a second impression for one generation.
        expect(new Set(impressions).size).toBe(impressions.length);
        // Active state tracks the model.
        expect(controller.isActive).toBe(finalActive(ops, availability));
      }),
      { numRuns: 100 },
    );
  });

  it("never reports a second impression for duplicate/overlapping starts while active", async () => {
    // availability all-true so every fresh generation displays an ad.
    const dupStartsArb = fc.array(fc.integer({ min: 1, max: 5 }), {
      minLength: 1,
      maxLength: 12,
    });
    await fc.assert(
      fc.asyncProperty(dupStartsArb, async (burstSizes) => {
        const { vscode } = makeMockVscode();
        const { client, impressions } = makeMockClient([]); // empty → defaults true
        const controller = new AdController({ vscode, client });

        let expected = 0;
        for (const burst of burstSizes) {
          // Fire `burst` start signals while active — only the first (when not
          // already active) yields an impression.
          for (let i = 0; i < burst; i++) {
            await controller.startGeneration();
          }
          expected += 1; // exactly one impression for this active generation
          expect(impressions).toHaveLength(expected);
          controller.completeGeneration();
        }

        expect(impressions).toHaveLength(burstSizes.length);
        expect(new Set(impressions).size).toBe(impressions.length);
      }),
      { numRuns: 100 },
    );
  });

  it("reports zero impressions and shows nothing when no ad is available", async () => {
    await fc.assert(
      fc.asyncProperty(opsArb, async (ops) => {
        const { vscode, progressCalls } = makeMockVscode();
        // availability all-false → getAd always returns { adAvailable: false }.
        const client: AdClientLike = {
          getAd: async () => ({ adAvailable: false }),
          reportImpression: async (campaignId: string) => {
            // Should never be called when no ad is available.
            throw new Error(`unexpected impression for ${campaignId}`);
          },
        };
        const impressions: string[] = [];
        const wrapped: AdClientLike = {
          getAd: client.getAd,
          reportImpression: async (id, token) => {
            impressions.push(id);
            return client.reportImpression(id, token);
          },
        };
        const controller = new AdController({ vscode, client: wrapped });

        for (const op of ops) {
          if (op === "start") {
            await controller.startGeneration();
          } else {
            controller.completeGeneration();
          }
        }

        expect(impressions).toHaveLength(0);
        expect(progressCalls).toHaveLength(0);
        expect(controller.isActive).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("concurrent overlapping starts (unawaited) still yield exactly one impression", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 8 }),
        async (concurrentStarts) => {
          const { vscode, progressCalls } = makeMockVscode();
          const { client, impressions } = makeMockClient([]); // defaults true
          const controller = new AdController({ vscode, client });

          // Launch many starts without awaiting between them; the `starting`
          // guard must collapse them into a single generation.
          await Promise.all(
            Array.from({ length: concurrentStarts }, () =>
              controller.startGeneration(),
            ),
          );

          expect(impressions).toHaveLength(1);
          expect(progressCalls).toHaveLength(1);
          expect(controller.isActive).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
