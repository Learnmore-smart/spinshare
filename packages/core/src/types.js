"use strict";
/**
 * Domain types for SpinShare.
 *
 * Pure, I/O-free type declarations shared across the web runtime, the CLI
 * wrapper, the VSCode extension, and the test suites. These mirror the design's
 * Data Models (Firestore collections) and API Contracts.
 *
 * Money convention (see design "Money/Ledger Math"):
 *   - Durable/whole-cent fields are suffixed `*_cents` and stored as integers.
 *   - Sub-cent revenue and retention use micro-cents (1 cent = 1000 micro-cents),
 *     suffixed `*Microcents`, also stored as integers, to stay exact.
 * Floats are never used for money.
 *
 * Timestamps: `@spinshare/core` is pure and does not depend on Firestore, so
 * time is represented as epoch milliseconds (`*Ms`) rather than Firestore
 * `Timestamp`. `createdAtMs` is the deterministic tie-break key for bidding.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map