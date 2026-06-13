"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORE_PACKAGE_NAME = void 0;
/** Domain types and API contract types (task 2.2). */
__exportStar(require("./types"), exports);
/** Integer-cent / micro-cent money math (task 2.4). */
__exportStar(require("./money"), exports);
/** Zod validation schemas (task 2.3). */
__exportStar(require("./schemas"), exports);
/** Pure bidding selection (task 2.6). */
__exportStar(require("./bidding"), exports);
/** Velocity window helpers + budget/balance conservation reducer (task 2.8). */
__exportStar(require("./velocity"), exports);
/** Package identifier, useful for diagnostics and health checks. */
exports.CORE_PACKAGE_NAME = "@spinshare/core";
//# sourceMappingURL=index.js.map