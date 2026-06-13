/**
 * Composition root for `@spinshare/web`.
 *
 * This is the single place where concrete adapters are bound to the provider
 * {@link ports}. Services, HTTP routes, the flush process, and the e2e harness
 * all depend only on the port interfaces and receive their implementations from
 * the {@link Container} produced here — so promoting from local to production is
 * a configuration change, never a code change (design "Architectural
 * Principles" / "Configuration switch").
 *
 * Selection is driven by `SPINSHARE_MODE` plus per-provider flags:
 *
 * | Flag                     | Values                              | Selects            |
 * |--------------------------|-------------------------------------|--------------------|
 * | `SPINSHARE_MODE`         | `local` (default) \| `production`   | overall defaults   |
 * | `SPINSHARE_REDIS`        | `memory` \| `ioredis-mock` \| <url> | `CounterStore`     |
 * | `FIRESTORE_EMULATOR_HOST`| host:port (presence)                | Firestore vs memory|
 * | `STRIPE_MODE`            | `mock` \| `test` \| `live`          | `PaymentGateway`   |
 * | `AUTH_MODE`              | `mock` \| `oauth`                   | `AuthProvider`     |
 *
 * In `local` mode counters default to {@link MemoryCounterStore}; the Firestore
 * repos are used when `FIRESTORE_EMULATOR_HOST` is set (the e2e default, same
 * client targeting the emulator) and otherwise fall back to pure in-memory
 * repos so local mode works with zero external dependencies. Production-only
 * adapters that are not implemented yet (Redis/Stripe/OAuth) throw a clear
 * error identifying the flag to flip back to a working local value.
 */

import type {
  AuthProvider,
  CampaignRepository,
  CounterStore,
  LedgerRepository,
  PaymentEventStore,
  PaymentGateway,
  UserRepository,
} from "./ports";
import {
  MemoryCampaignRepository,
  MemoryCounterStore,
  MemoryLedgerRepository,
  MemoryPaymentEventStore,
  MemoryUserRepository,
  MockAuthProvider,
  MockPaymentGateway,
  RandomIdGenerator,
  SystemClock,
  type Clock,
  type IdGenerator,
} from "./adapters/memory";
import {
  FirestoreCampaignRepo,
  FirestoreLedgerRepo,
  FirestorePaymentEventStore,
  FirestoreUserRepo,
} from "./adapters/firestore";
import { StripeGateway } from "./adapters/stripe";
// Import the concrete device-flow provider directly (not the barrel) so the
// composition root never pulls in the NextAuth browser-session instance: the
// adapter and its `validateToken` are pure crypto + an in-memory device store
// and must construct/validate without OAuth credentials present.
import { NextAuthDeviceProvider } from "./adapters/auth/nextauth-device-provider";

/** The fully-wired set of provider adapters every service depends on. */
export interface Container {
  /** Hot-path impression accounting + velocity/shadow-ban counters. */
  counters: CounterStore;
  /** Durable campaign records. */
  campaigns: CampaignRepository;
  /** Durable user records. */
  users: UserRepository;
  /** Durable per-impression ledger. */
  ledger: LedgerRepository;
  /** Funding via Stripe (or the mock gateway). */
  payments: PaymentGateway;
  /** Stripe webhook idempotency store (`paymentEvents/{eventId}`). */
  paymentEvents: PaymentEventStore;
  /** Device-flow authentication + token validation. */
  auth: AuthProvider;
}

/** Deployment mode resolved from `SPINSHARE_MODE`. */
export type SpinshareMode = "local" | "production";

/** A read-only view of the environment used for adapter selection. */
export type ContainerEnv = Record<string, string | undefined>;

/**
 * Builds the error thrown when a configuration value selects a
 * production-only adapter that has not been implemented yet.
 */
function notImplemented(
  adapter: string,
  selectedBy: string,
  workingHint: string,
): Error {
  return new Error(
    `${adapter} is not implemented in this mode yet (selected by ${selectedBy}). ` +
      `For local development use ${workingHint}.`,
  );
}

/** Resolves and validates the deployment mode. */
function resolveMode(env: ContainerEnv): SpinshareMode {
  const raw = (env.SPINSHARE_MODE ?? "local").toLowerCase();
  if (raw === "local" || raw === "production") {
    return raw;
  }
  throw new Error(
    `Invalid SPINSHARE_MODE="${env.SPINSHARE_MODE}". Expected "local" or "production".`,
  );
}

/** Selects the {@link CounterStore} from `SPINSHARE_REDIS`. */
function buildCounterStore(env: ContainerEnv, mode: SpinshareMode): CounterStore {
  const redis = (env.SPINSHARE_REDIS ?? (mode === "local" ? "memory" : "")).trim();
  if (redis === "memory" || redis === "ioredis-mock") {
    return new MemoryCounterStore();
  }
  // A connection string / Upstash URL selects the production Redis adapter.
  throw notImplemented(
    "RedisCounterStore",
    `SPINSHARE_REDIS="${redis}"`,
    "SPINSHARE_REDIS=memory",
  );
}

/**
 * Selects the durable Firestore-backed repositories. Uses the real Firestore
 * client (which targets the emulator when `FIRESTORE_EMULATOR_HOST` is set) in
 * production, or whenever the emulator host is configured locally. Otherwise —
 * local mode with no emulator — falls back to the pure in-memory repos so the
 * app runs with zero external dependencies.
 */
function buildDurableRepos(
  env: ContainerEnv,
  mode: SpinshareMode,
): Pick<Container, "campaigns" | "users" | "ledger" | "paymentEvents"> {
  const useFirestore =
    mode === "production" || Boolean(env.FIRESTORE_EMULATOR_HOST);

  if (useFirestore) {
    return {
      campaigns: new FirestoreCampaignRepo(),
      users: new FirestoreUserRepo(),
      ledger: new FirestoreLedgerRepo(),
      paymentEvents: new FirestorePaymentEventStore(),
    };
  }

  // Pure in-memory fallback: share a clock + id generator so created records
  // have consistent, deterministic-friendly time and ids.
  const clock: Clock = new SystemClock();
  const ids: IdGenerator = new RandomIdGenerator();
  return {
    campaigns: new MemoryCampaignRepository(clock, ids),
    users: new MemoryUserRepository(ids),
    ledger: new MemoryLedgerRepository(),
    paymentEvents: new MemoryPaymentEventStore(),
  };
}

/** Selects the {@link PaymentGateway} from `STRIPE_MODE`. */
function buildPaymentGateway(
  env: ContainerEnv,
  mode: SpinshareMode,
): PaymentGateway {
  const stripe = (env.STRIPE_MODE ?? (mode === "local" ? "mock" : "live")).trim();
  if (stripe === "mock") {
    return new MockPaymentGateway();
  }
  if (stripe === "test" || stripe === "live") {
    // The real Stripe SDK gateway. Credential-tolerant: constructing it never
    // throws without keys; only credentialed calls (checkout/webhook) require
    // STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET.
    return new StripeGateway(env);
  }
  throw new Error(
    `Invalid STRIPE_MODE="${env.STRIPE_MODE}". Expected "mock", "test", or "live".`,
  );
}

/** Selects the {@link AuthProvider} from `AUTH_MODE`. */
function buildAuthProvider(env: ContainerEnv, mode: SpinshareMode): AuthProvider {
  const auth = (env.AUTH_MODE ?? (mode === "local" ? "mock" : "oauth")).trim();
  if (auth === "mock") {
    return new MockAuthProvider();
  }
  if (auth === "oauth") {
    // NextAuth (Auth.js) + Google/GitHub for browser sessions; device tokens
    // are stateless HMAC-signed (validation works without OAuth creds). The
    // NextAuth route still requires GOOGLE_*/GITHUB_*/AUTH_SECRET at request
    // time to actually sign users in.
    return new NextAuthDeviceProvider({ env });
  }
  throw new Error(
    `Invalid AUTH_MODE="${env.AUTH_MODE}". Expected "mock" or "oauth".`,
  );
}

/**
 * Builds a fully-wired {@link Container} from the given environment (defaults to
 * `process.env`). Pure with respect to its input — pass an explicit env for
 * tests. See the module header for the selection rules.
 */
export function buildContainer(env: ContainerEnv = process.env): Container {
  const mode = resolveMode(env);
  return {
    counters: buildCounterStore(env, mode),
    ...buildDurableRepos(env, mode),
    payments: buildPaymentGateway(env, mode),
    auth: buildAuthProvider(env, mode),
  };
}

/** Process-wide singleton, lazily built on first access. */
let singleton: Container | undefined;

/**
 * Returns the process-wide {@link Container}, building it from `process.env` on
 * first use and reusing it thereafter. Routes and services should call this
 * rather than constructing adapters directly.
 */
export function getContainer(): Container {
  if (!singleton) {
    singleton = buildContainer();
  }
  return singleton;
}

/**
 * Clears the cached singleton. Intended for tests that need to rebuild the
 * container under a different environment.
 */
export function resetContainer(): void {
  singleton = undefined;
}
