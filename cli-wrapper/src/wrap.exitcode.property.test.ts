import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { exitCodeFor } from "./wrap.js";

/**
 * Feature: spinshare-ad-exchange, Property 23: Exit-code passthrough —
 * Validates: Requirements 5.6.
 *
 * The wrapper must exit with the child's own exit code on normal termination,
 * and with `128 + <signal number>` when the child is killed by a signal. A
 * signal always takes precedence over any numeric exit code, and unknown signal
 * names fall back to `128`. {@link exitCodeFor} is the pure mapping that the
 * spawning shell uses, so we drive it directly here with no real processes.
 */

/** Injected signal-number map (POSIX numbers), independent of the host OS. */
const SIGNAL_NUMBERS: Record<string, number> = {
  SIGINT: 2,
  SIGKILL: 9,
  SIGTERM: 15,
};

/** Arbitrary exit code: integers spanning the conventional 0..255 range. */
const exitCodeArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 255 });

/** A known signal name with a defined number in {@link SIGNAL_NUMBERS}. */
const knownSignalArb: fc.Arbitrary<string> = fc.constantFrom(
  ...Object.keys(SIGNAL_NUMBERS),
);

describe("Property 23: exit-code passthrough", () => {
  it("passes through the child's numeric exit code when there is no signal", () => {
    fc.assert(
      fc.property(
        fc.option(exitCodeArb, { nil: null }),
        (code) => {
          // signal=null → normal exit → pass through `code ?? 0`.
          expect(exitCodeFor(code, null, SIGNAL_NUMBERS)).toBe(code ?? 0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("maps signal termination to 128 + signal number, with signal taking precedence over code", () => {
    fc.assert(
      fc.property(
        knownSignalArb,
        // Code may be null or any value; the signal must win regardless.
        fc.option(exitCodeArb, { nil: null }),
        (signal, code) => {
          // `signal` is a key of SIGNAL_NUMBERS, so the lookup is defined.
          const expected = 128 + (SIGNAL_NUMBERS[signal] ?? 0);
          expect(exitCodeFor(code, signal, SIGNAL_NUMBERS)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("falls back to 128 for an unknown signal name, regardless of code", () => {
    fc.assert(
      fc.property(
        // Any non-empty name that is NOT a key in the injected map.
        fc.string({ minLength: 1, maxLength: 12 }).filter(
          (s) => !(s in SIGNAL_NUMBERS),
        ),
        fc.option(exitCodeArb, { nil: null }),
        (signal, code) => {
          // Unknown signal → 128 + 0; signal still takes precedence over code.
          expect(exitCodeFor(code, signal, SIGNAL_NUMBERS)).toBe(128);
        },
      ),
      { numRuns: 100 },
    );
  });
});
