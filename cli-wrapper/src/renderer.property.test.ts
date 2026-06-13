import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  SpinnerRenderer,
  isSpinnerFrame,
  SPINNER_CHARS,
} from "./renderer.js";

/**
 * Feature: spinshare-ad-exchange, Property 21: Spinner suppression and
 * non-spinner pass-through — Validates: Requirements 5.3, 5.5.
 *
 * The renderer is a pure chunk transform. For every spinner-only frame it must
 * suppress the original spinner glyphs (rendering the ad on a single
 * `\r`-updating line, or nothing when no ad is available). For every
 * non-spinner chunk it must forward the input bytes unmodified and in order.
 */

/** ANSI "erase to end of line" appended by the renderer (eraseLine default). */
const ERASE_TO_EOL = "\u001b[K";

/** The four spinner glyphs, materialized for generators/assertions. */
const GLYPHS = Array.from(SPINNER_CHARS) as string[];

/**
 * Tokens that may appear inside a spinner-only frame: the spinner glyphs plus
 * layout/control fillers (carriage returns, spaces, ANSI escape sequences) that
 * the classifier ignores.
 */
const spinnerToken = fc.constantFrom(
  ...GLYPHS,
  "\r",
  " ",
  "\u001b[2K",
  "\u001b[36m",
  "\u001b[0m",
  "\u001b[1A",
);

/**
 * A spinner-only frame: a sequence of spinner tokens guaranteed to contain at
 * least one spinner glyph (so it classifies as a wait-state frame).
 */
const spinnerFrameArb: fc.Arbitrary<string> = fc
  .array(spinnerToken, { minLength: 1, maxLength: 8 })
  .map((tokens) => {
    if (!tokens.some((t) => SPINNER_CHARS.has(t))) {
      tokens.push("|");
    }
    return tokens.join("");
  });

/**
 * Arbitrary "real output" text that is NOT classified as a spinner frame. We
 * generate printable-ASCII strings and exclude anything the classifier would
 * treat as a spinner-only frame, so these chunks must pass through unmodified.
 */
const nonSpinnerArb: fc.Arbitrary<string> = fc
  .string({ maxLength: 40 })
  .filter((s) => !isSpinnerFrame(s));

/**
 * Ad text used by the renderer. Either no ad (`null`) or a non-empty string
 * with spinner glyphs and carriage returns stripped, so the "no glyph leaks"
 * assertion is unambiguous (any glyph in the output would have to be a leak).
 */
const adArb: fc.Arbitrary<string | null> = fc.option(
  fc
    .string({ minLength: 1, maxLength: 40 })
    // Strip all four spinner glyphs and CR so any glyph in the rendered
    // output would unambiguously be a leak from the suppressed frame.
    .map((s) => s.replace(/[|/\\-]/g, ".").replace(/\r/g, ".")),
  { nil: null },
);

describe("Property 21: spinner suppression and non-spinner pass-through", () => {
  it("suppresses every spinner frame's glyphs and renders the ad on a \\r line (or nothing)", () => {
    fc.assert(
      fc.property(spinnerFrameArb, adArb, (frame, ad) => {
        const r = new SpinnerRenderer({ getAdText: () => ad });
        const res = r.render(frame);

        // It is always classified as a spinner frame.
        expect(res.spinner).toBe(true);

        const out = res.output.toString("utf8");
        if (ad && ad.length > 0) {
          // Ad present → exactly the single \r-updating line.
          expect(out).toBe("\r" + ad + ERASE_TO_EOL);
        } else {
          // No ad → spinner suppressed entirely (empty output).
          expect(res.output.length).toBe(0);
        }

        // None of the original spinner glyphs leak into the output.
        for (const glyph of GLYPHS) {
          expect(out.includes(glyph)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("forwards every non-spinner chunk unmodified, byte for byte", () => {
    fc.assert(
      fc.property(nonSpinnerArb, adArb, (chunk, ad) => {
        const r = new SpinnerRenderer({ getAdText: () => ad });
        const res = r.render(chunk);

        expect(res.spinner).toBe(false);
        // Output bytes equal the input bytes exactly (pass-through).
        expect(Buffer.compare(res.output, Buffer.from(chunk, "utf8"))).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("preserves original non-spinner bytes, in order, across a full interleaving", () => {
    const taggedArb = fc.oneof(
      spinnerFrameArb.map((text) => ({ kind: "spinner" as const, text })),
      nonSpinnerArb.map((text) => ({ kind: "real" as const, text })),
    );

    fc.assert(
      fc.property(
        fc.array(taggedArb, { maxLength: 20 }),
        adArb,
        (frames, ad) => {
          const r = new SpinnerRenderer({ getAdText: () => ad });

          const realInputs: Buffer[] = [];
          const realOutputs: Buffer[] = [];

          for (const frame of frames) {
            const res = r.render(frame.text);
            if (frame.kind === "spinner") {
              expect(res.spinner).toBe(true);
            } else {
              expect(res.spinner).toBe(false);
              const inBytes = Buffer.from(frame.text, "utf8");
              realInputs.push(inBytes);
              realOutputs.push(res.output);
              // Each real chunk passes through unmodified.
              expect(Buffer.compare(res.output, inBytes)).toBe(0);
            }
          }

          // The concatenation of non-spinner outputs equals the concatenation
          // of the original non-spinner inputs, preserving order.
          expect(
            Buffer.compare(
              Buffer.concat(realOutputs),
              Buffer.concat(realInputs),
            ),
          ).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
