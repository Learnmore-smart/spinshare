# Plan: Cycle CLAUDE_STATES through ALL loading verbs

## Problem

The homepage "Stock Claude Code" animation only cycles through 4 hardcoded verbs:
```ts
const CLAUDE_STATES = [
  { action: "Conjuring", category: "Bash", duration: 3.1 },
  { action: "Noodling", category: "Glob", duration: 1.4 },
  { action: "Baking", category: "Write", duration: 0.9 },
  { action: "Thinking", category: "Read", duration: 2.2 },
];
```

The user wants it to alternate through **all** 91 loading verbs (from `LOADING_VERBS` in `LoadingStatus.tsx` / `en.json`), not just these 4.

## Current State

- `LOADING_VERBS` (91 verbs) already exists in `web/src/components/LoadingStatus.tsx` (line 13) and `web/src/data/loading-verbs/en.json`
- `CLAUDE_STATES` is hardcoded with only 4 entries in `web/src/app/page.tsx` (line 74-79)
- Each state has `action`, `category`, and `duration`
- The animation cycles `claudeStateIndex` modulo `CLAUDE_STATES.length` (line 188)
- Categories shown: Bash, Glob, Write, Read — these are Claude Code tool names

## Proposed Change

**File: `web/src/app/page.tsx`**

1. Import `LOADING_VERBS` from `@/components/LoadingStatus` (already imported on line 10)
2. Replace the hardcoded `CLAUDE_STATES` array with a dynamically generated one from `LOADING_VERBS`
3. Each verb gets a rotating category (cycle through Bash, Glob, Write, Read) and a randomized duration (1.0–3.5s range to mimic realistic Claude Code behavior)

```ts
const CLAUDE_CATEGORIES = ["Bash", "Glob", "Write", "Read"] as const;

const CLAUDE_STATES = LOADING_VERBS.map((verb, i) => ({
  action: verb,
  category: CLAUDE_CATEGORIES[i % CLAUDE_CATEGORIES.length],
  duration: 1.0 + ((i * 7 + 3) % 25) / 10, // deterministic pseudo-random 1.0–3.5s
})) as const;
```

This gives all 91 verbs, each with a cycling category and varied duration, with no randomness (deterministic so SSR matches client).

## Verification

1. Run `corepack pnpm@9.12.0 --filter web test` to check existing tests pass
2. Visually verify the homepage cycles through all verbs
