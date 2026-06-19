import { describe, expect, it } from "vitest";
import {
  SpinnerRenderer,
  isSpinnerFrame,
  stripAnsi,
  SPINNER_CHARS,
} from "./renderer.js";

describe("isSpinnerFrame", () => {
  it("recognizes each bare spinner glyph", () => {
    for (const ch of SPINNER_CHARS) {
      expect(isSpinnerFrame(ch)).toBe(true);
      expect(isSpinnerFrame("\r" + ch)).toBe(true);
      expect(isSpinnerFrame("\r" + ch + " ")).toBe(true);
    }
  });

  it("recognizes spinner frames wrapped in ANSI cursor codes", () => {
    expect(isSpinnerFrame("\u001b[2K\r|")).toBe(true);
    expect(isSpinnerFrame("\u001b[36m/\u001b[0m")).toBe(true);
  });

  it("recognizes Claude-style loading status lines", () => {
    expect(isSpinnerFrame("\r\u2022 Pollinating\u2026")).toBe(true);
    expect(isSpinnerFrame("\u001b[31m\u00b7 Pollinating...\u001b[0m")).toBe(true);
    expect(isSpinnerFrame("\rThinking...")).toBe(true);
    expect(isSpinnerFrame("\r\u28c7 Generating...")).toBe(true);
    expect(isSpinnerFrame("\r\u2726 Generating...")).toBe(true);
    expect(isSpinnerFrame("\r\u28cb Working...")).toBe(true);
  });

  it("rejects real text output", () => {
    expect(isSpinnerFrame("Building project...")).toBe(false);
    expect(isSpinnerFrame("done\n")).toBe(false);
    expect(isSpinnerFrame("Loading config...")).toBe(false);
  });

  it("rejects empty / whitespace-only / ansi-only chunks", () => {
    expect(isSpinnerFrame("")).toBe(false);
    expect(isSpinnerFrame("\r ")).toBe(false);
    expect(isSpinnerFrame("\u001b[0m")).toBe(false);
  });

  it("rejects mixed spinner + text chunks", () => {
    expect(isSpinnerFrame("- compiling")).toBe(false);
    expect(isSpinnerFrame("foo | bar")).toBe(false);
  });
});

describe("stripAnsi", () => {
  it("removes escape sequences but keeps content", () => {
    expect(stripAnsi("\u001b[36mhello\u001b[0m")).toBe("hello");
  });
});

describe("SpinnerRenderer", () => {
  it("suppresses spinner frames and renders ad text on a \\r line", () => {
    const r = new SpinnerRenderer({ getAdText: () => "Buy SpinShare Pro" });
    const res = r.render("\r|");
    expect(res.spinner).toBe(true);
    const out = res.output.toString("utf8");
    expect(out.startsWith("\r")).toBe(true);
    expect(out).toContain("Buy SpinShare Pro");
    // none of the original spinner glyphs leak through
    expect(out).not.toContain("|");
  });

  it("replaces loading status lines with ad text", () => {
    const r = new SpinnerRenderer({ getAdText: () => "Buy SpinShare Pro" });
    const res = r.render("\r\u2022 Pollinating\u2026");

    expect(res.spinner).toBe(true);
    const out = res.output.toString("utf8");
    expect(out).toContain("Buy SpinShare Pro");
    expect(out).not.toContain("Pollinating");
  });

  it("replaces Antigravity-style prefixed generation lines with ad text", () => {
    const r = new SpinnerRenderer({ getAdText: () => "Buy SpinShare Pro" });
    const res = r.render("\r\u28c7 Generating...");

    expect(res.spinner).toBe(true);
    const out = res.output.toString("utf8");
    expect(out).toContain("Buy SpinShare Pro");
    expect(out).not.toContain("Generating");
  });

  it("can paint ads below status lines without moving the child cursor", () => {
    const r = new SpinnerRenderer({
      getAdText: () => "Buy SpinShare Pro",
      statusPlacement: "below",
    });
    const res = r.render("\r\u28cb Working...");

    expect(res.spinner).toBe(true);
    const out = res.output.toString("utf8");
    expect(out).toContain("Working");
    expect(out).toContain("Buy SpinShare Pro");
    expect(out).toContain("\u001b[s\u001b[1B\r");
    expect(out.endsWith("\u001b[u")).toBe(true);
  });

  it("clears a below-status ad before forwarding real output", () => {
    const r = new SpinnerRenderer({
      getAdText: () => "Buy SpinShare Pro",
      statusPlacement: "below",
    });

    r.render("\r\u28cb Working...");
    const res = r.render("done\n");

    expect(res.spinner).toBe(false);
    const out = res.output.toString("utf8");
    expect(out.startsWith("\u001b[s\u001b[1B\r\u001b[K\u001b[u")).toBe(true);
    expect(out.endsWith("done\n")).toBe(true);
  });

  it("suppresses spinner frames entirely when no ad is available", () => {
    const r = new SpinnerRenderer({ getAdText: () => null });
    const res = r.render("\r/");
    expect(res.spinner).toBe(true);
    expect(res.output.length).toBe(0);
  });

  it("forwards non-spinner output unmodified", () => {
    const r = new SpinnerRenderer({ getAdText: () => "ad" });
    const input = "compiling main.ts\n";
    const res = r.render(input);
    expect(res.spinner).toBe(false);
    expect(res.output.toString("utf8")).toBe(input);
  });

  it("preserves non-spinner bytes exactly for Buffer input", () => {
    const r = new SpinnerRenderer({ getAdText: () => "ad" });
    const buf = Buffer.from([0x00, 0x42, 0xff, 0x0a]);
    const res = r.render(buf);
    expect(res.spinner).toBe(false);
    expect(Buffer.compare(res.output, buf)).toBe(0);
  });

  it("renderAll preserves order across interleaved frames", () => {
    const r = new SpinnerRenderer({ getAdText: () => "AD", eraseLine: false });
    const out = r
      .renderAll(["before ", "\r|", "\r/", "after"])
      .toString("utf8");
    // real text appears in order; spinner frames replaced by \rAD
    expect(out).toBe("before \rAD\rADafter");
  });
});
