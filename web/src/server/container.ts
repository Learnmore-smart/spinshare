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
    return new RealtimeDbCounterStore();
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
 * Selects the durable Firestore-backed repositories. Uses Firestore in production,
 * when the emulator host is configured, or when local mode explicitly opts in
 * (`SPINSHARE_USE_FIRESTORE=1`). Otherwise — local mode — falls back to the pure
 * in-memory repos so the app runs with zero external dependencies and seeds demo
 * campaigns for CLI/dashboard testing.
 */
function buildDurableRepos(
  env: ContainerEnv,
  mode: SpinshareMode,
): Pick<Container, "campaigns" | "users" | "ledger" | "paymentEvents"> {
  const useFirestore =
    mode === "production" || (mode === "local" && useFirestoreInLocal(env));

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
      paymentEvents: new FirestorePaymentEventStore(),
    };
  }

  // Pure in-memory fallback: share a clock + id generator so created records
  // have consistent, deterministic-friendly time and ids.
  const clock: Clock = new SystemClock();
  const ids: IdGenerator = new RandomIdGenerator();
  const campaigns = new MemoryCampaignRepository(clock, ids);
  const users = new MemoryUserRepository(ids);
  const ledger = new MemoryLedgerRepository();
  const paymentEvents = new MemoryPaymentEventStore();

  // In local mode, provision durable data for the local test accounts so the
  // dashboards show real content immediately after a credential sign-in. Scoped
  // to the interactive dev server only (`next dev` → NODE_ENV="development"):
  // never under test (Vitest), e2e (`next start`), build, or production, so it
  // can't pollute deterministic fixtures or real data.
  if (mode === "local" && process.env.NODE_ENV === "development") {
    seedLocalTestData({ users, campaigns, ledger });
  }

  return { campaigns, users, ledger, paymentEvents };
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

/** Process-wide singleton for production builds. */
let singleton: Container | undefined;

/** Process-wide singleton, lazily built on first access. Survives Next.js dev HMR. */
const CONTAINER_KEY = Symbol.for("spinshare.container");

/**
 * Returns the process-wide {@link Container}, building it from `process.env` on
 * first use and reusing it thereafter. Routes and services should call this
 * rather than constructing adapters directly.
 */
export function getContainer(): Container {
  if (process.env.NODE_ENV === "development") {
    const g = globalThis as Record<symbol, Container | undefined>;
    if (!g[CONTAINER_KEY]) {
      g[CONTAINER_KEY] = buildContainer();
    }
    return g[CONTAINER_KEY];
  }
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
  const g = globalThis as Record<symbol, Container | undefined>;
  delete g[CONTAINER_KEY];
  const storeKey = Symbol.for("spinshare.deviceCodeStore");
  delete (globalThis as Record<symbol, unknown>)[storeKey];
}
