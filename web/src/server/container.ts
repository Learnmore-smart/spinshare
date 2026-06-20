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
 * | `SPINSHARE_COUNTER`      | `memory` \| `rtdb`                  | `CounterStore`     |
 * | `SPINSHARE_RTDB_ROOT_PATH` | RTDB path                          | optional hot root override |
 * | `FIREBASE_DATABASE_URL`  | RTDB url (required for `rtdb`)      | RTDB connection    |
 * | `FIRESTORE_EMULATOR_HOST`| host:port (presence)                | Firestore vs memory|
 * | `SPINSHARE_USE_FIRESTORE` | `1` (local only)                   | cloud Firestore in local mode |
 * | `STRIPE_MODE`            | `mock` \| `test` \| `live`          | `PaymentGateway`   |
 * | `AUTH_MODE`              | `mock` \| `oauth`                   | `AuthProvider`     |
 *
 * In `local` mode counters default to {@link MemoryCounterStore}; in
 * `production` they default to {@link RealtimeDbCounterStore} (Firebase Realtime
 * Database — the Google-native replacement for the former Redis/Upstash hot
 * path). The Firestore repos are used when `FIRESTORE_EMULATOR_HOST` is set (the
 * e2e default, same client targeting the emulator) and otherwise fall back to
 * pure in-memory repos so local mode works with zero external dependencies.
 * Production-only adapters that are not implemented yet (Stripe/OAuth) throw a
 * clear error identifying the flag to flip back to a working local value.
 */

import type {
  AuthProvider,
  ActivityRepository,
  CampaignRepository,
  CounterStore,
  ImpressionProgressRepository,
  LedgerRepository,
  PaymentEventStore,
  PaymentGateway,
  PayoutAttemptRepository,
  PayoutGateway,
  UserRepository,
} from "./ports";
import {
  MemoryCampaignRepository,
  MemoryActivityRepository,
  MemoryCounterStore,
  MemoryImpressionProgressRepository,
  MemoryLedgerRepository,
  MemoryPaymentEventStore,
  MemoryPayoutAttemptRepository,
  MemoryUserRepository,
  MockAuthProvider,
  MockPaymentGateway,
  MockPayoutGateway,
  RandomIdGenerator,
  SystemClock,
  type Clock,
  type IdGenerator,
} from "./adapters/memory";
import {
  FirestoreCampaignRepo,
  FirestoreActivityRepo,
  FirestoreImpressionProgressRepo,
  FirestoreLedgerRepo,
  FirestorePaymentEventStore,
  FirestorePayoutAttemptRepo,
  FirestoreUserRepo,
} from "./adapters/firestore";
import { StripeGateway, StripePayoutGateway } from "./adapters/stripe";
import { RealtimeDbCounterStore } from "./adapters/rtdb";
// Import the concrete device-flow provider directly (not the barrel) so the
// composition root never pulls in the NextAuth browser-session instance: the
// adapter and its `validateToken` are pure crypto + an in-memory device store
// and must construct/validate without OAuth credentials present.
import { NextAuthDeviceProvider } from "./adapters/auth/nextauth-device-provider";
import { seedLocalTestData } from "./dev/seed-local-data";

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
  /** Durable attempt-level activity records. */
  activities: ActivityRepository;
  /** Durable cumulative viewability progress records. */
  progress: ImpressionProgressRepository;
  /** Funding via Stripe (or the mock gateway). */
  payments: PaymentGateway;
  /** Developer payouts via Stripe Connect (or the mock gateway). */
  payouts: PayoutGateway;
  /** Stripe webhook idempotency store (`paymentEvents/{eventId}`). */
  paymentEvents: PaymentEventStore;
  /** Durable payout provider reconciliation attempts. */
  payoutAttempts: PayoutAttemptRepository;
  /** Device-flow authentication + token validation. */
  auth: AuthProvider;
}

/** Deployment mode resolved from `SPINSHARE_MODE`. */
export type SpinshareMode = "local" | "production";

/** A read-only view of the environment used for adapter selection. */
export type ContainerEnv = Record<string, string | undefined>;

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

function rtdbNamespaceSegment(namespace: string): string {
  const trimmed = namespace.trim();
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }
  return `b64_${Buffer.from(trimmed, "utf8").toString("base64url")}`;
}

export function resolveRtdbRootPath(
  env: ContainerEnv,
  mode: SpinshareMode,
): string | undefined {
  const explicit = (env.SPINSHARE_RTDB_ROOT_PATH ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (explicit.length > 0) {
    return explicit;
  }
  if (mode !== "local") {
    return undefined;
  }

  const namespace =
    (env.SPINSHARE_FIRESTORE_NAMESPACE ?? "").trim() || "local";
  return `spinshare/namespaces/${rtdbNamespaceSegment(namespace)}/hot`;
}

/**
 * Selects the {@link CounterStore} from `SPINSHARE_COUNTER` (defaults to
 * `memory` locally, `rtdb` in production). `rtdb` selects the Google-native
 * {@link RealtimeDbCounterStore} and requires `FIREBASE_DATABASE_URL`.
 */
function buildCounterStore(env: ContainerEnv, mode: SpinshareMode): CounterStore {
  const counter = (
    env.SPINSHARE_COUNTER ?? (mode === "local" ? "memory" : "rtdb")
  ).trim();
  if (counter === "memory") {
    return new MemoryCounterStore();
  }
  if (counter === "rtdb") {
    if (!(env.FIREBASE_DATABASE_URL ?? "").trim()) {
      throw new Error(
        'FIREBASE_DATABASE_URL must be set when SPINSHARE_COUNTER="rtdb" ' +
          "(the Firebase Realtime Database URL, e.g. " +
          'https://<project>-default-rtdb.firebaseio.com). For local development use SPINSHARE_COUNTER=memory.',
      );
    }
    const rootPath = resolveRtdbRootPath(env, mode);
    return new RealtimeDbCounterStore(
      rootPath === undefined ? {} : { rootPath },
    );
  }
  throw new Error(
    `Invalid SPINSHARE_COUNTER="${env.SPINSHARE_COUNTER}". Expected "memory" or "rtdb".`,
  );
}

/**
 * True when an explicit Firebase service-account credential is configured
 * (`FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`). Lets local development run
 * against real cloud Firestore just by providing creds — without flipping
 * `SPINSHARE_MODE` to production (which would disable the local email/password
 * test accounts used to sign in to the dashboards).
 */
function hasFirebaseServiceAccount(env: ContainerEnv): boolean {
  return Boolean(
    (env.FIREBASE_CLIENT_EMAIL ?? "").trim() &&
      (env.FIREBASE_PRIVATE_KEY ?? "").trim(),
  );
}

/**
 * True when local dev should talk to Firestore instead of the in-memory repos.
 *
 * Local mode defaults to in-memory + {@link seedLocalTestData} so `pnpm dev` and
 * `pnpm cli:test:local` work out of the box even when Firebase service-account
 * creds are present for OAuth. Opt in to cloud Firestore with
 * `SPINSHARE_USE_FIRESTORE=1`, or use the emulator via `FIRESTORE_EMULATOR_HOST`.
 */
function useFirestoreInLocal(env: ContainerEnv): boolean {
  if (Boolean(env.FIRESTORE_EMULATOR_HOST)) {
    return true;
  }
  return (env.SPINSHARE_USE_FIRESTORE ?? "").trim() === "1";
}

/**
 * Prevents local smoke tests from mutating top-level cloud Firestore
 * collections. Emulator use is already isolated by `FIRESTORE_EMULATOR_HOST`,
 * but local cloud Firestore must be scoped to an explicit namespace such as
 * `test`.
 */
function assertLocalFirestoreIsolation(
  env: ContainerEnv,
  mode: SpinshareMode,
): void {
  const localCloudFirestore =
    mode === "local" &&
    (env.SPINSHARE_USE_FIRESTORE ?? "").trim() === "1" &&
    !env.FIRESTORE_EMULATOR_HOST;
  if (
    localCloudFirestore &&
    !(env.SPINSHARE_FIRESTORE_NAMESPACE ?? "").trim()
  ) {
    throw new Error(
      "SPINSHARE_FIRESTORE_NAMESPACE must be set when " +
        "SPINSHARE_MODE=local uses cloud Firestore via " +
        "SPINSHARE_USE_FIRESTORE=1. Use FIRESTORE_EMULATOR_HOST for the " +
        "emulator, or set SPINSHARE_FIRESTORE_NAMESPACE=test to keep localhost " +
        "writes out of top-level production collections.",
    );
  }
}

/**
 * Real Stripe Checkout redirects/webhooks are multi-request and often
 * multi-process. Local memory repos cannot safely hold the campaign/activity
 * records that Stripe funding must reconcile against, so block this hybrid
 * before a user can pay into an unfunded invisible campaign.
 */
function assertLocalRealStripeUsesDurableStorage(
  env: ContainerEnv,
  mode: SpinshareMode,
): void {
  const stripeMode = (env.STRIPE_MODE ?? (mode === "local" ? "mock" : "live")).trim();
  if (
    mode === "local" &&
    (stripeMode === "test" || stripeMode === "live") &&
    !useFirestoreInLocal(env)
  ) {
    throw new Error(
      `STRIPE_MODE="${stripeMode}" in local mode requires durable Firestore ` +
        "storage. Set FIRESTORE_EMULATOR_HOST for the emulator, or set " +
        "SPINSHARE_USE_FIRESTORE=1 with SPINSHARE_FIRESTORE_NAMESPACE=test " +
        "for namespace-isolated cloud Firestore. Use STRIPE_MODE=mock for " +
        "pure in-memory local development.",
    );
  }
}

/**
 * Selects the durable Firestore-backed repositories. Uses Firestore in production,
 * when the emulator host is configured, or when local mode explicitly opts in
 * (`SPINSHARE_USE_FIRESTORE=1`). Otherwise — local mode — falls back to the pure
 * in-memory repos so the app runs with zero external dependencies and seeds demo
 * campaigns for CLI/dashboard testing.
 */
function buildDurableRepos(
  env: ContainerEnv,
  mode: SpinshareMode,
): Pick<
  Container,
  | "campaigns"
  | "users"
  | "ledger"
  | "activities"
  | "progress"
  | "paymentEvents"
  | "payoutAttempts"
> {
  const useFirestore =
    mode === "production" || (mode === "local" && useFirestoreInLocal(env));

  assertLocalFirestoreIsolation(env, mode);

  if (
    useFirestore &&
    mode === "production" &&
    !env.FIRESTORE_EMULATOR_HOST &&
    !hasFirebaseServiceAccount(env)
  ) {
    throw new Error(
      'SPINSHARE_MODE="production" requires FIREBASE_CLIENT_EMAIL and ' +
        "FIREBASE_PRIVATE_KEY in .env (or set FIRESTORE_EMULATOR_HOST for the " +
        "local emulator). Without them the Admin SDK falls back to Application " +
        "Default Credentials, which fails locally and the developer dashboard " +
        "shows a generic load error.",
    );
  }

  if (useFirestore) {
    return {
      campaigns: new FirestoreCampaignRepo(),
      users: new FirestoreUserRepo(),
      ledger: new FirestoreLedgerRepo(),
      activities: new FirestoreActivityRepo(),
      progress: new FirestoreImpressionProgressRepo(),
      paymentEvents: new FirestorePaymentEventStore(),
      payoutAttempts: new FirestorePayoutAttemptRepo(),
    };
  }

  // Pure in-memory fallback: share a clock + id generator so created records
  // have consistent, deterministic-friendly time and ids.
  const clock: Clock = new SystemClock();
  const ids: IdGenerator = new RandomIdGenerator();
  const campaigns = new MemoryCampaignRepository(clock, ids);
  const users = new MemoryUserRepository(ids);
  const ledger = new MemoryLedgerRepository();
  const activities = new MemoryActivityRepository();
  const progress = new MemoryImpressionProgressRepository();
  const paymentEvents = new MemoryPaymentEventStore();
  const payoutAttempts = new MemoryPayoutAttemptRepository();

  // In local mode, provision demo data only when explicitly requested. Keeping
  // this off by default prevents the funded LearnX campaign from masking
  // whether a local Stripe/webhook test actually funded the user's campaign.
  if (
    mode === "local" &&
    process.env.NODE_ENV === "development" &&
    (env.SPINSHARE_SEED_LOCAL_DATA ?? "").trim() === "1"
  ) {
    seedLocalTestData({ users, campaigns, ledger });
  }

  return {
    campaigns,
    users,
    ledger,
    activities,
    progress,
    paymentEvents,
    payoutAttempts,
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

/**
 * Selects the {@link PayoutGateway} from `STRIPE_MODE` (same switch as funding).
 * `mock` locally wires {@link MockPayoutGateway} (instant onboarding, no creds);
 * `test`/`live` wire the real Stripe Connect gateway (credential-tolerant —
 * only credentialed calls require `STRIPE_SECRET_KEY`).
 */
function buildPayoutGateway(
  env: ContainerEnv,
  mode: SpinshareMode,
): PayoutGateway {
  const stripe = (env.STRIPE_MODE ?? (mode === "local" ? "mock" : "live")).trim();
  if (stripe === "mock") {
    return new MockPayoutGateway();
  }
  if (stripe === "test" || stripe === "live") {
    return new StripePayoutGateway(env);
  }
  throw new Error(
    `Invalid STRIPE_MODE="${env.STRIPE_MODE}". Expected "mock", "test", or "live".`,
  );
}
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
  assertLocalRealStripeUsesDurableStorage(env, mode);
  return {
    counters: buildCounterStore(env, mode),
    ...buildDurableRepos(env, mode),
    payments: buildPaymentGateway(env, mode),
    payouts: buildPayoutGateway(env, mode),
    auth: buildAuthProvider(env, mode),
  };
}

/** Process-wide singleton for production builds. */
let singleton: Container | undefined;

/** Process-wide singleton, lazily built on first access. Survives Next.js dev HMR. */
const CONTAINER_KEY = Symbol.for("spinshare.container");

function containerHasPlatformStatsSupport(container: Container): boolean {
  return (
    typeof container.users.listAll === "function" &&
    typeof container.campaigns.listAll === "function" &&
    typeof container.ledger.summarizeFleet === "function"
  );
}

/**
 * Returns the process-wide {@link Container}, building it from `process.env` on
 * first use and reusing it thereafter. Routes and services should call this
 * rather than constructing adapters directly.
 */
export function getContainer(): Container {
  if (process.env.NODE_ENV === "development") {
    const g = globalThis as Record<symbol, Container | undefined>;
    const cached = g[CONTAINER_KEY];
    if (!cached || !containerHasPlatformStatsSupport(cached)) {
      g[CONTAINER_KEY] = buildContainer();
    }
    return g[CONTAINER_KEY]!;
  }
  if (!singleton || !containerHasPlatformStatsSupport(singleton)) {
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
  const g = globalThis as Record<symbol, Container | undefined>;
  delete g[CONTAINER_KEY];
  const storeKey = Symbol.for("spinshare.deviceCodeStore");
  delete (globalThis as Record<symbol, unknown>)[storeKey];
}
