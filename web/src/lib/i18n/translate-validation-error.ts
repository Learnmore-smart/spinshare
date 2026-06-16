import type { Dictionary } from "./types";

/** Maps English validation messages from `advertiser/lib` to localized copy. */
export function translateValidationError(message: string, t: Dictionary): string {
  switch (message) {
    case "Enter a valid CPM bid in dollars (up to two decimals).":
      return t.errors.cpmInvalid;
    case "CPM bid must be at least $1.00.":
    case "CPM bid must be at least $1.00":
      return t.errors.cpmMin;
    case "CPM bid must be at most $1,000.00.":
      return t.errors.cpmMax;
    case "Enter a valid amount in dollars (up to two decimals).":
      return t.errors.fundingInvalid;
    case "Amount must be at least $1.00.":
      return t.errors.fundingMin;
    case "Amount must be at most $100,000.00.":
      return t.errors.fundingMax;
    case "Enter a whole number of blocks.":
      return t.errors.blocksWholeNumber;
    case "Buy at least 1 block.":
      return t.errors.checkoutMinTotal;
    default:
      return message;
  }
}
