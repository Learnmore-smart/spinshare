# container.test.ts

> Last updated: 2026-06-15 | Protection: STANDARD

## Purpose

Tests composition-root adapter selection and local development safety switches.

## Planned Coverage

- Local development memory repos should not seed the funded LearnX campaign unless explicitly requested.
- `SPINSHARE_SEED_LOCAL_DATA=1` should keep the demo seed path available.
- Explicit local seed should use a clearly local SpinShare sample campaign, not
  the old LearnX mock advertiser.
- Local cloud Firestore opt-in must fail fast without `SPINSHARE_FIRESTORE_NAMESPACE`.
- Firestore emulator opt-in should remain allowed without namespace.

## Implemented Coverage 2026-06-15

Added local Firestore isolation tests:
- `SPINSHARE_USE_FIRESTORE=1` without emulator or namespace throws.
- `FIRESTORE_EMULATOR_HOST` remains allowed without namespace.

## Planned Regression 2026-06-16 Remove LearnX Seed

Update explicit seed coverage to require `brandName: "SpinShare Local"` and to
reject any seeded campaign whose brand/ad text still contains `LearnX`.

## Implemented Regression 2026-06-16 Remove LearnX Seed

The explicit local seed test now requires the sample campaign to use
`brandName: "SpinShare Local"` and `destinationUrl:
"https://www.spinshare.dev"`, and asserts no biddable seeded campaign contains
`LearnX` in brand or ad text.

## Planned Regression 2026-06-16 Local Real Stripe Durability

Add coverage that local real Stripe (`STRIPE_MODE=test` or `live`) cannot be
paired with memory durable repositories. The regression should fail until
`buildContainer()` rejects the unsafe hybrid mode, and should continue allowing:

- `STRIPE_MODE=mock` with memory repos.
- `STRIPE_MODE=test` with `FIRESTORE_EMULATOR_HOST`.
- `STRIPE_MODE=test` with `SPINSHARE_USE_FIRESTORE=1` and
  `SPINSHARE_FIRESTORE_NAMESPACE=test`.

## Implemented Regression 2026-06-16 Local Real Stripe Durability

Added three focused tests:

- local `STRIPE_MODE=test` with memory durable repos throws.
- local `STRIPE_MODE=test` with `FIRESTORE_EMULATOR_HOST` is allowed.
- local `STRIPE_MODE=test` with `SPINSHARE_USE_FIRESTORE=1` and namespace
  `test` is allowed.

## Planned Regression 2026-06-16 Local RTDB Hot Counter Isolation

Add coverage for the pure RTDB root-path resolver:

- production mode without an override should keep the adapter default root.
- local mode with `SPINSHARE_FIRESTORE_NAMESPACE=test` should use
  `spinshare/namespaces/test/hot`.
- local mode without a namespace should use `spinshare/namespaces/local/hot`
  instead of the shared production hot path.
- `SPINSHARE_RTDB_ROOT_PATH` should override the derived root path.

This regression should fail until the resolver exists and is wired into the
composition root.

## Implemented Regression 2026-06-16 Local RTDB Hot Counter Isolation

Added `resolveRtdbRootPath` coverage:

- production without override returns `undefined`, preserving the adapter
  default.
- local `SPINSHARE_FIRESTORE_NAMESPACE=test` returns
  `spinshare/namespaces/test/hot`.
- local without namespace returns `spinshare/namespaces/local/hot`.
- explicit `SPINSHARE_RTDB_ROOT_PATH` is honored.

## Dependencies

- `web/src/server/container.ts`
- `web/src/server/dev/seed-local-data.ts`

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-16 | Added local RTDB hot counter namespace tests. | Codex |
| 2026-06-16 | Planned local RTDB hot counter namespace tests. | Codex |
| 2026-06-16 | Added local real Stripe durability guard tests. | Codex |
| 2026-06-16 | Planned local real Stripe durability guard tests. | Codex |
| 2026-06-16 | Added regression for removing LearnX local seed data. | Codex |
| 2026-06-16 | Planned regression for removing LearnX local seed data. | Codex |
| 2026-06-15 | Implemented local Firestore namespace guard tests. | Codex |
| 2026-06-15 | Planned local Firestore namespace guard tests. | Codex |
| 2026-06-15 | Created doc before adding container seed tests. | Codex |
