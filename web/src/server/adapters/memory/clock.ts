/**
 * Deterministic time + id primitives for the in-memory / mock adapters.
 *
 * Every adapter that needs "now" or a generated identifier takes a {@link Clock}
 * and an {@link IdGenerator} by injection. Production code wires the real
 * defaults ({@link SystemClock} + {@link RandomIdGenerator}); tests wire a
 * {@link ManualClock} + {@link SequentialIdGenerator} so time and ids are fully
 * reproducible (see design "Local Development & Testability Strategy").
 */

/** A source of wall-clock time, expressed in epoch milliseconds. */
export interface Clock {
  /** Current time as integer epoch milliseconds. */
  nowMs(): number;
}

/**
 * A source of opaque identifiers (ledger `entryId`s, batch tokens, campaign /
 * user ids, mock session / device codes). Kept tiny and injectable so tests can
 * pin every generated id.
 */
export interface IdGenerator {
  /** Returns the next id, optionally namespaced by `prefix`. */
  next(prefix?: string): string;
}

/** Real clock backed by `Date.now()`. The production default. */
export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
}

/**
 * Test clock with an explicit, mutable "now". Time only advances when a test
 * calls {@link advanceMs} / {@link setMs}, making velocity-window and
 * shadow-ban TTL behavior deterministic.
 */
export class ManualClock implements Clock {
  private current: number;

  constructor(startMs = 0) {
    this.current = startMs;
  }

  nowMs(): number {
    return this.current;
  }

  /** Advances the clock by `deltaMs` milliseconds (must be non-negative). */
  advanceMs(deltaMs: number): void {
    if (deltaMs < 0) throw new Error("ManualClock cannot move backwards");
    this.current += deltaMs;
  }

  /** Advances the clock by `deltaSec` seconds. */
  advanceSeconds(deltaSec: number): void {
    this.advanceMs(deltaSec * 1000);
  }

  /** Sets the absolute time, in epoch milliseconds. */
  setMs(ms: number): void {
    this.current = ms;
  }
}

/**
 * Deterministic, monotonically-increasing id generator. Ids look like
 * `"<prefix>_<n>"` where `n` is a zero-padded counter, e.g. `"batch_000001"`.
 * The default for tests.
 */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly pad = 6) {}

  next(prefix = "id"): string {
    this.counter += 1;
    return `${prefix}_${this.counter.toString().padStart(this.pad, "0")}`;
  }
}

/**
 * Random id generator backed by `crypto.randomUUID()`. The production default.
 */
export class RandomIdGenerator implements IdGenerator {
  next(prefix = "id"): string {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
}
