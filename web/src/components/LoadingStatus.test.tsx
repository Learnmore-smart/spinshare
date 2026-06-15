import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LoadingStatus, * as loadingStatusModule from "./LoadingStatus";

type LoadingStatusSubject = typeof loadingStatusModule & {
  CLAUDE_CLAY_HEX: string;
  ELLIPSIS_STEP_MS: number;
  ICON_FRAME_MS: number;
  ICON_LOOP_MS: number;
  LOADING_ICONS: readonly string[];
  LOADING_VERBS: readonly string[];
  formatLoadingText: (verb: string, dotCount: number) => string;
  getDotCountForElapsedMs: (elapsedMs: number) => number;
  getIconForElapsedMs: (elapsedMs: number) => string;
  pickRandomVerb: (
    currentVerb?: string,
    random?: () => number,
  ) => string;
};

const subject = loadingStatusModule as LoadingStatusSubject;

describe("LoadingStatus", () => {
  it("locks the Claude clay color and clean English verb pool", () => {
    expect(subject.CLAUDE_CLAY_HEX).toBe("#c15f3c");
    expect(subject.LOADING_VERBS).toEqual([
      "Absorbing",
      "Aggregating",
      "Aligning",
      "Analyzing",
      "Assembling",
      "Attenuating",
      "Baking",
      "Blending",
      "Boiling",
      "Brewing",
      "Building",
      "Bundling",
      "Calculating",
      "Churning",
      "Clustering",
      "Coalescing",
      "Compiling",
      "Composing",
      "Compressing",
      "Computing",
      "Crunching",
      "Smooshing",
      "Decoding",
      "Decomposing",
      "Developing",
      "Diagnosing",
      "Digesting",
      "Encoding",
      "Evaluating",
      "Exploring",
      "Extracting",
      "Filtering",
      "Formatting",
      "Formulating",
      "Generating",
      "Gathering",
      "Grokking",
      "Hashing",
      "Harvesting",
      "Indexing",
      "Inferring",
      "Initializing",
      "Integrating",
      "Iterating",
      "Joining",
      "Judging",
      "Loading",
      "Linking",
      "Layering",
      "Mapping",
      "Matching",
      "Merging",
      "Mining",
      "Modelling",
      "Normalizing",
      "Narrowing",
      "Optimizing",
      "Organizing",
      "Parsing",
      "Processing",
      "Polishing",
      "Programming",
      "Projecting",
      "Quantizing",
      "Querying",
      "Queueing",
      "Rendering",
      "Refactoring",
      "Retrieving",
      "Routing",
      "Sampling",
      "Scraping",
      "Searching",
      "Sorting",
      "Synthesizing",
      "Solving",
      "Translating",
      "Traversing",
      "Tracing",
      "Trimming",
      "Updating",
      "Unzipping",
      "Unifying",
      "Validating",
      "Vectorizing",
      "Verifying",
      "Weaving",
      "Wrangling",
      "Zipping",
    ]);
    expect(new Set(subject.LOADING_VERBS).size).toBe(subject.LOADING_VERBS.length);
    expect(subject.LOADING_VERBS.every((verb) => /^[A-Za-z]+$/.test(verb))).toBe(true);
  });

  it("cycles the Claude Code icon sequence over exactly 1080ms", () => {
    const expectedIcons = [
      "\u00b7", // ·
      "\u002a", // *
      "\u2722", // ✢
      "\u2736", // ✶
      "\u273b", // ✻
      "\u273d", // ✽
    ];

    expect(subject.ICON_FRAME_MS).toBe(180);
    expect(subject.ICON_LOOP_MS).toBe(1080);
    expect(subject.LOADING_ICONS).toEqual(expectedIcons);
    expect(
      [0, 180, 360, 540, 720, 900, 1080].map((elapsedMs) =>
        subject.getIconForElapsedMs(elapsedMs),
      ),
    ).toEqual([...expectedIcons, "\u00b7"]);
  });

  it("formats the ellipsis cycle over exactly one second", () => {
    expect(subject.ELLIPSIS_STEP_MS).toBe(360);
    expect(
      [0, 359, 360, 719, 720, 1079, 1080].map((elapsedMs) =>
        subject.getDotCountForElapsedMs(elapsedMs),
      ),
    ).toEqual([0, 0, 1, 1, 2, 2, 0]);
    expect([0, 1, 2, 3].map((dotCount) =>
      subject.formatLoadingText("Loading", dotCount),
    )).toEqual(["Loading", "Loading .", "Loading ..", "Loading ..."]);
  });

  it("selects a different verb when the one-second ellipsis cycle resets", () => {
    expect(subject.pickRandomVerb("Absorbing", () => 0)).toBe("Aggregating");
    expect(subject.pickRandomVerb("Zipping", () => 0.999)).not.toBe("Zipping");
  });

  it("renders the LearnX status row with logo and Claude clay styling", () => {
    Object.assign(globalThis, { React });

    const html = renderToStaticMarkup(
      React.createElement(LoadingStatus, { initialVerb: "Loading" }),
    );

    expect(html).toContain("role=\"status\"");
    expect(html).toContain("Loading");
    expect(html).toContain("LearnX \u00b7 Know exactly what to study");
    expect(html).toContain("favicon-32x32.png");
    expect(html).toContain("text-[#c15f3c]");
  });
});
