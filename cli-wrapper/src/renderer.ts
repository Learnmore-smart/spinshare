/**
 * @spinshare/cli — spinner-interception transform (task 13.2).
 *
 * This module is a PURE, side-effect-free transform. It does not touch real
 * streams, spawn processes, or perform any I/O — that wiring lands in task 13.4
 * (`wrap.ts`). Keeping the classification and rendering logic pure makes it
 * directly drivable by the Property 21 test (task 13.3) and reusable by the
 * child-process wrapper.
 *
 * Behavior (design "CLI Wrapper" + Requirements 5.2–5.5):
 *   - A chunk that consists solely of spinner characters from `{ |, /, -, \ }`
 *     (optionally accompanied by carriage returns, spaces, and ANSI escape
 *     sequences) is a wait-state / spinner-only frame. Its bytes are SUPPRESSED;
 *     in their place the current ad text is rendered on a single `\r`-updating
 *     line.
 *   - Any other chunk is "real" output and is forwarded UNMODIFIED, byte for
 *     byte, preserving order.
 *
 * The transform classifies whole chunks (one chunk == one frame), matching the
 * way the wrapper reads discrete frames off the child's stdout and the way the
 * property test interleaves spinner / non-spinner frames.
 */

/** The four ASCII spinner glyphs recognized as wait-state animation frames. */
export const SPINNER_CHARS: ReadonlySet<string> = new Set(["|", "/", "-", "\\"]);

/**
 * Standard ANSI escape-sequence matcher (CSI sequences such as cursor moves and
 * SGR color codes, plus OSC sequences). Used to ignore terminal control codes
 * when deciding whether a frame is "spinner only".
 */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g;

/** Carriage returns and spaces are layout-only inside a spinner frame. */
// eslint-disable-next-line no-control-regex
const SPINNER_FILLER = /[\r ]/g;

/** Single-word wait messages emitted by interactive AI CLIs. */
const STATUS_WORD_PATTERN =
  /^(?:pollinating|thinking|generating|loading|processing|waiting|working|reasoning|responding|analyzing|searching)(?:[.!…]*)$/i;

/** Leading symbols commonly used before transient status lines. */
const STATUS_PREFIX_PATTERN =
  /^[\s\r]*(?:[\u2022\u00b7*\u205d\u205e\u22ee\u2726\u2727\u2731\u2736\u2800-\u28ff]\s*)?/;

/** ANSI "erase to end of line" — clears stale characters from a longer prior ad. */
const ERASE_TO_EOL = "\u001b[K";

/**
 * Wrap `text` in an OSC 8 terminal hyperlink pointing at `url`, making the ad
 * clickable in hyperlink-aware terminals (iTerm2, Windows Terminal, GNOME
 * Terminal, VTE, kitty, …). Terminals without OSC 8 support simply render the
 * plain `text` and ignore the escape, so this degrades gracefully.
 *
 * Sequence: `ESC ] 8 ; ; URL BEL  text  ESC ] 8 ; ; BEL`.
 */
export function osc8Hyperlink(url: string, text: string): string {
  const OSC = "\u001b]8;;";
  const BEL = "\u0007";
  return `${OSC}${url}${BEL}${text}${OSC}${BEL}`;
}

/** Normalize a chunk to a UTF-8 string for classification/inspection. */
function toStr(chunk: string | Buffer): string {
  return typeof chunk === "string" ? chunk : chunk.toString("utf8");
}

/**
 * Convert a chunk to a Buffer WITHOUT altering its bytes, so non-spinner output
 * is forwarded exactly as received (important for binary-safe pass-through).
 */
function toBuffer(chunk: string | Buffer): Buffer {
  return typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk);
}

/** Strip ANSI escape sequences from a string. Exposed for reuse/testing. */
export function stripAnsi(input: string | Buffer): string {
  return toStr(input).replace(ANSI_PATTERN, "");
}

function isSpinnerGlyphFrame(chunk: string | Buffer): boolean {
  const stripped = stripAnsi(chunk).replace(SPINNER_FILLER, "");
  if (stripped.length === 0) {
    return false; // nothing but CR / spaces / ANSI is not a spinner animation
  }
  for (const ch of stripped) {
    if (!SPINNER_CHARS.has(ch)) {
      return false; // contains real output, so forward unmodified
    }
  }
  return true;
}

function isStatusWaitFrame(chunk: string | Buffer): boolean {
  const stripped = stripAnsi(chunk)
    .replace(/\u001b\[K/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();

  if (stripped.length === 0 || stripped.length > 80) {
    return false;
  }

  const status = stripped.replace(STATUS_PREFIX_PATTERN, "").trim();
  return STATUS_WORD_PATTERN.test(status);
}

function waitFrameKind(chunk: string | Buffer): "glyph" | "status" | null {
  if (isSpinnerGlyphFrame(chunk)) {
    return "glyph";
  }
  if (isStatusWaitFrame(chunk)) {
    return "status";
  }
  return null;
}

/**
 * Pure classifier: is this chunk a spinner-only (wait-state) frame?
 *
 * A chunk qualifies when, after removing ANSI escape sequences, carriage
 * returns, and spaces, the remaining content is non-empty and consists ONLY of
 * spinner glyphs from {@link SPINNER_CHARS}. A chunk with no spinner glyph
 * (e.g. plain text, a newline, or pure whitespace) is NOT a spinner frame and
 * is treated as real output.
 */
export function isSpinnerFrame(chunk: string | Buffer): boolean {
  if (isSpinnerGlyphFrame(chunk) || isStatusWaitFrame(chunk)) {
    return true;
  }
  const stripped = stripAnsi(chunk).replace(SPINNER_FILLER, "");
  if (stripped.length === 0) {
    return false; // nothing but CR / spaces / ANSI — not a spinner animation
  }
  for (const ch of stripped) {
    if (!SPINNER_CHARS.has(ch)) {
      return false; // contains real output → forward unmodified
    }
  }
  return true;
}

/** The outcome of transforming a single input chunk. */
export interface RenderResult {
  /** Exact bytes to write to the real stdout for this chunk. */
  output: Buffer;
  /**
   * True when the chunk was classified as a spinner-only frame. Task 13.4 uses
   * this to detect wait-state start/end and debounce impression reporting.
   */
  spinner: boolean;
}

export interface RendererOptions {
  /**
   * Returns the ad text to display while a spinner is active, or `null`/`""`
   * when no ad is available. When absent, spinner frames are simply suppressed
   * (the neutral-fallback policy is decided by the wrapper in task 13.4).
   */
  getAdText: () => string | null | undefined;
  /**
   * Optional getter for the ad's click-through URL. When it returns a non-empty
   * URL while a spinner is active, the rendered ad text is wrapped in an OSC 8
   * terminal hyperlink so the developer can click the ad. When absent or empty,
   * the ad is rendered as plain text.
   */
  getAdUrl?: () => string | null | undefined;
  /**
   * When true (default), append an ANSI "erase to end of line" after the ad so
   * a shorter ad fully overwrites a longer previous one on the shared line.
   */
  eraseLine?: boolean;
  /**
   * How text status wait frames should display ads. `replace` preserves the
   * original historical behavior. `below` keeps the agent's loading line and
   * paints the ad one line below using save/restore cursor sequences so the
   * child CLI keeps control of its prompt/status line.
   */
  statusPlacement?: "replace" | "below";
}

/**
 * Pure spinner-interception transform.
 *
 * Feed it chunks via {@link SpinnerRenderer.render} (one chunk per frame). It
 * returns the bytes to write plus whether the chunk was a spinner frame. It
 * holds no stream references and performs no I/O, so it is fully deterministic
 * for a fixed `getAdText`.
 */
export class SpinnerRenderer {
  private readonly getAdText: () => string | null | undefined;
  private readonly getAdUrl: () => string | null | undefined;
  private readonly eraseLine: boolean;
  private readonly statusPlacement: "replace" | "below";
  private belowStatusAdVisible = false;

  constructor(options: RendererOptions) {
    this.getAdText = options.getAdText;
    this.getAdUrl = options.getAdUrl ?? (() => undefined);
    this.eraseLine = options.eraseLine ?? true;
    this.statusPlacement = options.statusPlacement ?? "replace";
  }

  /**
   * Transform a single chunk.
   *
   * - Spinner-only frame → suppress its bytes; emit `\r<ad>[erase]` on the
   *   shared updating line (or nothing when no ad is available). When the ad has
   *   a click-through URL, the text is wrapped in an OSC 8 hyperlink so it is
   *   clickable in supporting terminals.
   * - Anything else → forward the original bytes unmodified.
   */
  render(chunk: string | Buffer): RenderResult {
    const kind = waitFrameKind(chunk);
    if (kind !== null) {
      const ad = this.getAdText();
      if (ad && ad.length > 0) {
        const url = this.getAdUrl();
        const display = url && url.length > 0 ? osc8Hyperlink(url, ad) : ad;
        const line = "\r" + display + (this.eraseLine ? ERASE_TO_EOL : "");
        if (kind === "status" && this.statusPlacement === "below") {
          this.belowStatusAdVisible = true;
          const original = toStr(chunk) + (this.eraseLine ? ERASE_TO_EOL : "");
          return {
            output: Buffer.from(
              original + `\u001b[s\u001b[1B${line}\u001b[u`,
              "utf8",
            ),
            spinner: true,
          };
        }
        return { output: Buffer.from(line, "utf8"), spinner: true };
      }
      if (kind === "status" && this.statusPlacement === "below") {
        return { output: toBuffer(chunk), spinner: true };
      }
      // No ad to show: suppress the spinner entirely.
      return { output: Buffer.alloc(0), spinner: true };
    }
    const passthrough = toBuffer(chunk);
    if (this.belowStatusAdVisible) {
      this.belowStatusAdVisible = false;
      const clearBelow = `\u001b[s\u001b[1B\r${ERASE_TO_EOL}\u001b[u`;
      return {
        output: Buffer.concat([Buffer.from(clearBelow, "utf8"), passthrough]),
        spinner: false,
      };
    }
    return { output: passthrough, spinner: false };
  }

  /**
   * Convenience for tests / batch use: transform a sequence of chunks and
   * return the concatenated output bytes, preserving order.
   */
  renderAll(chunks: Array<string | Buffer>): Buffer {
    return Buffer.concat(chunks.map((c) => this.render(c).output));
  }
}

/**
 * Functional convenience wrapper around {@link SpinnerRenderer} for callers that
 * prefer not to manage an instance.
 */
export function createRenderer(options: RendererOptions): SpinnerRenderer {
  return new SpinnerRenderer(options);
}
