import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  WaitStateTracker,
  countImpressions,
  type FrameClassification,
} from "./wrap.js";

/**
 * Feature: spinshare-ad-exchange, Property 22: Exactly one impression per wait
 * state — Validates: Requirements 5.7.
 *
 * A "wait state" is a maximal contiguous run of spinner frames. No matter how
 * many spinner frames occur inside one run, exactly ONE impression is reported
 * for that run; a non-spinner frame ends the wait state. Therefore the number
 * of impressions over any frame sequence equals the number of contiguous
 * spinner runs.
 *
 * We verify this two ways against an independently-computed run count:
 *   - the pure {@link countImpressions} helper, and
 *   - driving {@link WaitStateTracker.observe} across the sequence, additionally
 *     asserting `impression` is never true on a non-spinner frame nor on a
 *     spinner frame that immediately follows another spinner frame.
 */

/** A single frame classification: spinner true/false. */
const frameArb: fc.Arbitrary<FrameClassification> = fc
  .boolean()
  .map((spinner) => ({ spinner }));

/** Arbitrary sequences of frames, including the empty sequence. */
const framesArb: fc.Arbitrary<FrameClassification[]> = fc.array(frameArb, {
  maxLength: 60,
});

/**
 * Independently count the number of maximal contiguous runs of spinner frames
 * in the sequence (a wait state = one such run). A run is counted at its first
 * spinner frame: a spinner frame starts a new run iff the previous frame was
 * not a spinner frame.
 */
function countContiguousSpinnerRuns(
  frames: ReadonlyArray<FrameClassification>,
): number {
  let runs = 0;
  let prevSpinner = false;
  for (const frame of frames) {
    if (frame.spinner && !prevSpinner) {
      runs += 1;
    }
    prevSpinner = frame.spinner;
  }
  return runs;
}

describe("Property 22: exactly one impression per wait state", () => {
  it("countImpressions equals the number of contiguous spinner runs", () => {
    fc.assert(
      fc.property(framesArb, (frames) => {
        expect(countImpressions(frames)).toBe(
          countContiguousSpinnerRuns(frames),
        );
      }),
      { numRuns: 100 },
    );
  });

  it("WaitStateTracker emits one impression per wait state and never mid-run", () => {
    fc.assert(
      fc.property(framesArb, (frames) => {
        const tracker = new WaitStateTracker();
        let impressions = 0;
        let prevSpinner = false;

        for (const frame of frames) {
          const step = tracker.observe(frame);
          if (step.impression) {
            impressions += 1;
          }

          // Impression must never fire on a non-spinner frame...
          if (!frame.spinner) {
            expect(step.impression).toBe(false);
          }
          // ...nor on a spinner frame immediately following another spinner
          // frame (those are debounced into the run already in progress).
          if (frame.spinner && prevSpinner) {
            expect(step.impression).toBe(false);
          }

          // inWaitState mirrors whether the current frame is a spinner frame.
          expect(step.inWaitState).toBe(frame.spinner);

          prevSpinner = frame.spinner;
        }

        // Exactly one impression per contiguous spinner run.
        expect(impressions).toBe(countContiguousSpinnerRuns(frames));
      }),
      { numRuns: 100 },
    );
  });
});
