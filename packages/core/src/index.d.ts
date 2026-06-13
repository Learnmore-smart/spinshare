/**
 * @spinshare/core — pure, no-I/O foundation for SpinShare.
 *
 * Single source of truth for money math, bidding selection, velocity window
 * helpers, domain types, and Zod validation schemas. Consumed by the Next.js
 * web app, the Node CLI wrapper, the VSCode extension, and the test suites so
 * that monetary results can never disagree across artifacts.
 *
 * Barrel re-exports are added by subsequent tasks:
 *   - export * from "./schemas";  // task 2.3
 *   - export * from "./money";    // task 2.4
 *   - export * from "./bidding";  // task 2.6
 *   - export * from "./velocity"; // task 2.8
 */
/** Domain types and API contract types (task 2.2). */
export * from "./types";
/** Integer-cent / micro-cent money math (task 2.4). */
export * from "./money";
/** Zod validation schemas (task 2.3). */
export * from "./schemas";
/** Pure bidding selection (task 2.6). */
export * from "./bidding";
/** Velocity window helpers + budget/balance conservation reducer (task 2.8). */
export * from "./velocity";
/** Package identifier, useful for diagnostics and health checks. */
export declare const CORE_PACKAGE_NAME: "@spinshare/core";
//# sourceMappingURL=index.d.ts.map