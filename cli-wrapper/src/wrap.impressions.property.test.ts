import { describe, expect, it } from "vitest";
import fc from "fast-check";

import {
  WaitStateTracker,
  countImpressions,
  type FrameClassification,
} from "./wrap.js";

/**
 * Property 22: exactly one impression per eligible wait state.
 *
 * A wait state is a maximal contiguous run of spinner frames. It becomes
 * eligible only when an observed spinner frame is at least 3000 ms after the
 * run started. Shorter runs produce zero impressions.
 */

const frameArb: fc.Arbitrary<FrameClassification> = fc.record({
  spinner: fc.boolean(),
  atMs: fc.integer({ min: 0, max: 20_000 }),
});

const framesArb: fc.Arbitrary<FrameClassification[]> = fc.array(frameArb, {
  maxLength: 60,
});

function sortByTime(frames: ReadonlyArray<FrameClassification>): FrameClassification[] {
  return [...frames].sort((a, b) => (a.atMs ?? 0) - (b.atMs ?? 0));
}

function countEligibleSpinnerRuns(
  frames: ReadonlyArray<FrameClassification>,
): number {
  let runs = 0;
  let active = false;
  let reported = false;
  let startMs = 0;

  for (const frame of frames) {
    const atMs = frame.atMs ?? 0;
    if (frame.spinner) {
      if (!active) {
        active = true;
        reported = false;
        startMs = atMs;
      }
      if (!reported && atMs - startMs >= 3000) {
        runs += 1;
        reported = true;
      }
    } else {
      active = false;
      reported = false;
    }
  }

  return runs;
}

describe("Property 22: exactly one impression per eligible wait state", () => {
  it("countImpressions equals the number of spinner runs that reach 3 seconds", () => {
    fc.assert(
      fc.property(framesArb, (rawFrames) => {
        const frames = sortByTime(rawFrames);
        expect(countImpressions(frames)).toBe(countEligibleSpinnerRuns(frames));
      }),
      { numRuns: 100 },
    );
  });

  it("WaitStateTracker emits one impression per eligible wait state and never before 3 seconds", () => {
    fc.assert(
      fc.property(framesArb, (rawFrames) => {
        const frames = sortByTime(rawFrames);
        const tracker = new WaitStateTracker();
        let impressions = 0;

        for (const frame of frames) {
          const step = tracker.observe(frame, frame.atMs ?? 0);
          if (step.impression) {
            impressions += 1;
            expect(step.viewDurationMs).toBeGreaterThanOrEqual(3000);
          }

          if (!frame.spinner) {
            expect(step.impression).toBe(false);
          }
          expect(step.inWaitState).toBe(frame.spinner);
        }

        expect(impressions).toBe(countEligibleSpinnerRuns(frames));
      }),
      { numRuns: 100 },
    );
  });
});
