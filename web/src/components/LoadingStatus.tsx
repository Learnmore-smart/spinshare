"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export const CLAUDE_CLAY_HEX = "#c15f3c";
export const ICON_FRAME_MS = 125;
export const ICON_LOOP_MS = 1000;
export const ELLIPSIS_STEP_MS = 250;

export const LOADING_VERBS = [
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
] as const;

export const LOADING_ICONS = [
  "\u2736",
  "\u273b",
  "\u2722",
  "\u273d",
  "\u273a",
  "\u273d",
  "\u2722",
  "\u273b",
] as const;

export type LoadingVerb = (typeof LOADING_VERBS)[number];

const BRAND_TEXT = "LearnX \u00b7 Know exactly what to study";
const DOTS_PER_ICON_FRAME = ELLIPSIS_STEP_MS / ICON_FRAME_MS;
const FALLBACK_LOADING_ICON = "\u2736";

interface LoadingAnimationState {
  frameIndex: number;
  verb: LoadingVerb;
}

export interface LoadingStatusProps {
  className?: string;
  initialVerb?: LoadingVerb;
}

function normalizeLoopElapsedMs(elapsedMs: number): number {
  const normalized = elapsedMs % ICON_LOOP_MS;
  return normalized < 0 ? normalized + ICON_LOOP_MS : normalized;
}

export function getIconForElapsedMs(elapsedMs: number): string {
  const frameIndex =
    Math.floor(normalizeLoopElapsedMs(elapsedMs) / ICON_FRAME_MS) %
    LOADING_ICONS.length;

  return LOADING_ICONS[frameIndex] ?? FALLBACK_LOADING_ICON;
}

export function getDotCountForElapsedMs(elapsedMs: number): number {
  return Math.floor(normalizeLoopElapsedMs(elapsedMs) / ELLIPSIS_STEP_MS);
}

export function formatLoadingText(verb: string, dotCount: number): string {
  const clampedDotCount = Math.max(0, Math.min(3, Math.trunc(dotCount)));
  return clampedDotCount === 0
    ? verb
    : `${verb} ${".".repeat(clampedDotCount)}`;
}

export function pickRandomVerb(
  currentVerb?: string,
  random: () => number = Math.random,
): LoadingVerb {
  const candidates =
    currentVerb && LOADING_VERBS.length > 1
      ? LOADING_VERBS.filter((verb) => verb !== currentVerb)
      : LOADING_VERBS;
  const index = Math.min(
    candidates.length - 1,
    Math.floor(random() * candidates.length),
  );

  return candidates[index] as LoadingVerb;
}

function getDotCountForFrameIndex(frameIndex: number): number {
  return Math.floor(frameIndex / DOTS_PER_ICON_FRAME);
}

function getNextAnimationState(
  previousState: LoadingAnimationState,
): LoadingAnimationState {
  const nextFrameIndex =
    (previousState.frameIndex + 1) % LOADING_ICONS.length;

  return {
    frameIndex: nextFrameIndex,
    verb:
      nextFrameIndex === 0
        ? pickRandomVerb(previousState.verb)
        : previousState.verb,
  };
}

export default function LoadingStatus({
  className,
  initialVerb,
}: LoadingStatusProps) {
  const [animationState, setAnimationState] = useState<LoadingAnimationState>(
    () => ({
      frameIndex: 0,
      verb: initialVerb ?? pickRandomVerb(),
    }),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAnimationState(getNextAnimationState);
    }, ICON_FRAME_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const icon =
    LOADING_ICONS[animationState.frameIndex] ?? FALLBACK_LOADING_ICON;
  const dotCount = getDotCountForFrameIndex(animationState.frameIndex);
  const dotText = dotCount > 0 ? ` ${".".repeat(dotCount)}` : "";
  const loadingText = formatLoadingText(animationState.verb, dotCount);

  return (
    <div
      aria-label={`${loadingText}. ${BRAND_TEXT}`}
      aria-live="polite"
      className={cn(
        "flex w-full items-center justify-between gap-4 border-t border-[#eadfd8] bg-[#fdfbf9] px-4 py-3 font-sans",
        className,
      )}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-3 text-[#c15f3c]">
        <span
          aria-hidden="true"
          className="grid h-5 w-5 shrink-0 select-none place-items-center text-lg leading-none"
        >
          {icon}
        </span>
        <span className="min-w-[9rem] select-none text-sm font-semibold leading-5 tracking-normal text-[#c15f3c]">
          <span>{animationState.verb}</span>
          <span className="inline-block w-[2.25ch] text-left">{dotText}</span>
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2 text-xs leading-5">
        <Image
          alt=""
          aria-hidden="true"
          className="h-4 w-4 shrink-0 rounded-[3px]"
          height={16}
          sizes="16px"
          src="/learnx/favicon-32x32.png"
          width={16}
        />
        <span className="truncate whitespace-nowrap select-none font-semibold text-[#c15f3c]">
          {BRAND_TEXT}
        </span>
      </div>
    </div>
  );
}
