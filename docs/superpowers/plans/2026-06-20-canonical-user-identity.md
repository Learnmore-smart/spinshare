# Canonical User Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace random Auth.js OAuth UUIDs with one persistent canonical user identity shared by repeated Google/GitHub sign-ins.

**Architecture:** A deterministic email-derived canonical ID handles first-time and legacy-session convergence. A server-only `userIdentities` mapping permanently binds each provider account to that canonical ID, so later email changes do not split the account. Auth callbacks resolve and persist the identity before issuing a JWT; only verified OAuth emails may create or link users.

**Tech Stack:** TypeScript, Next.js 16, Auth.js v5, Firebase Admin/Firestore transactions, Vitest.

---

## File map

- Create `web/src/server/identity/canonical-user-id.ts`: normalization and hashed canonical/mapping keys.
- Create `web/src/server/identity/canonical-user-id.test.ts`: deterministic key tests.
- Create `web/src/server/adapters/auth/verified-oauth-email.ts`: Google/GitHub verified-email resolution.
- Create `web/src/server/adapters/auth/verified-oauth-email.test.ts`: provider verification tests.
- Create `web/src/server/adapters/auth/canonical-auth-callbacks.ts`: testable canonical JWT/session callbacks.
- Create `web/src/server/adapters/auth/nextauth-config.test.ts`: canonical callback regression tests.
- Modify `packages/core/src/types.ts`: linked-provider metadata on `User`.
- Modify `web/src/server/ports/user-repository.ts`: verified identity contract.
- Modify `web/src/server/adapters/memory/memory-user-repository.ts`: contract-equivalent identity mapping.
- Modify `web/src/server/adapters/firestore/collections.ts`: `userIdentities` collection and provider mapping.
- Modify `web/src/server/adapters/firestore/user-repo.ts`: transactional identity resolution/upsert.
- Modify `web/src/server/ports/__contracts__/user-repository.contract.ts`: adapter-parity identity tests.
- Modify `web/src/server/adapters/auth/nextauth-config.ts`: persist canonical identity before JWT issue.
- Create `web/scripts/delete-legacy-user-docs.mjs`: exact-path cleanup command.

### Task 1: Documentation-first declarations

**Files:**
- Create/modify the `.ai/` mirrors for every file in the file map.

- [ ] **Step 1: Record the root cause and planned interfaces**

Document that Auth.js creates a random OAuth `user.id` without an adapter, that
`token.sub` currently copies it, and that `upsertFromIdentity` is not called.
Record the canonical-ID, identity-map, verified-email, conflict, and cleanup
decisions before modifying production code.

- [ ] **Step 2: Verify all target code files have current `.ai/` mirrors**

Run:

```powershell
Get-ChildItem .ai/web/src/server -Recurse -File | Select-Object FullName
```

Expected: every modified/created code and test file has a matching document.

### Task 2: Canonical identity primitives

**Files:**
- Create: `web/src/server/identity/canonical-user-id.ts`
- Create: `web/src/server/identity/canonical-user-id.test.ts`
- Modify: `packages/core/src/types.ts`
- Modify: `web/src/server/ports/user-repository.ts`

- [ ] **Step 1: Write failing canonical-key tests**

```ts
expect(canonicalUserIdForEmail(" Noah@Example.com ")).toBe(
  canonicalUserIdForEmail("noah@example.com"),
);
expect(identityMappingId("google", "123")).not.toBe(
  identityMappingId("github", "123"),
);
expect(() => normalizeIdentityEmail(" ")).toThrow("email");
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/identity/canonical-user-id.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement deterministic keys and verified identity types**

```ts
export function normalizeIdentityEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Verified identity email is required");
  return normalized;
}

export function canonicalUserIdForEmail(email: string): string {
  return `usr_${createHash("sha256").update(normalizeIdentityEmail(email)).digest("hex")}`;
}

export function identityMappingId(provider: AuthProviderId, accountId: string): string {
  return createHash("sha256").update(`${provider}\0${accountId}`).digest("hex");
}
```

Add `providers?: AuthProviderId[]` to `User` and require
`emailVerified: true` in `ExternalIdentity`.

- [ ] **Step 4: Verify GREEN**

Run the Task 2 focused test. Expected: PASS.

### Task 3: Repository identity convergence

**Files:**
- Modify: `web/src/server/ports/__contracts__/user-repository.contract.ts`
- Modify: `web/src/server/adapters/memory/memory-user-repository.ts`
- Modify: `web/src/server/adapters/firestore/collections.ts`
- Modify: `web/src/server/adapters/firestore/user-repo.ts`

- [ ] **Step 1: Add failing shared contract cases**

```ts
const google = await repo.upsertFromIdentity({
  provider: "google", providerAccountId: uid("google"),
  email: "Person@Example.com", emailVerified: true,
});
const github = await repo.upsertFromIdentity({
  provider: "github", providerAccountId: uid("github"),
  email: "person@example.com", emailVerified: true,
});
expect(github.id).toBe(google.id);
expect((await repo.listAll()).filter((u) => u.id === google.id)).toHaveLength(1);
```

Also assert repeated sign-in and email change for the same provider account keep
the ID, metadata refresh preserves balance/hold data, and unverified identity is
rejected.

- [ ] **Step 2: Verify RED against memory adapter**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/memory/memory-user-repository.contract.test.ts
```

Expected: FAIL because current identity IDs are provider-specific/generated.

- [ ] **Step 3: Implement memory identity mapping**

Use `identityMappingId()` for the provider index. When absent, derive the ID from
the verified normalized email. Merge `providers`, update email/provider, and
preserve all financial fields.

- [ ] **Step 4: Implement Firestore transaction**

Add `COLLECTIONS.userIdentities`. In one transaction, read the identity mapping
and normalized-email user matches, resolve their common `userId` or
`canonicalUserIdForEmail(email)`, read the user, merge metadata/defaults, and set
the mapping. Store explicit `id` on the user and fail closed on conflicts.
Never replace balances, held lots, payout fields, or `createdAt`.

- [ ] **Step 5: Verify repository GREEN**

Run the memory contract. If an emulator is available, run the Firestore contract
with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`. Expected: PASS.

### Task 4: Verified OAuth email boundary

**Files:**
- Create: `web/src/server/adapters/auth/verified-oauth-email.ts`
- Create: `web/src/server/adapters/auth/verified-oauth-email.test.ts`

- [ ] **Step 1: Write failing provider tests**

Cover Google `email_verified: true`, Google rejection when false, GitHub selecting
a verified primary email from `/user/emails`, GitHub fallback to another verified
email, and rejection when none are verified.

- [ ] **Step 2: Verify RED**

Run the new focused test. Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement resolver**

```ts
if (provider === "google") {
  if (profile.email_verified !== true || typeof profile.email !== "string") {
    throw new Error("Google did not provide a verified email");
  }
  return normalizeIdentityEmail(profile.email);
}
const response = await fetch("https://api.github.com/user/emails", {
  headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "spinshare" },
});
const verified = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
if (!verified) throw new Error("GitHub did not provide a verified email");
return normalizeIdentityEmail(verified.email);
```

- [ ] **Step 4: Verify GREEN**

Run the focused resolver test. Expected: PASS.

### Task 5: Auth.js canonical JWT integration

**Files:**
- Create: `web/src/server/adapters/auth/nextauth-config.test.ts`
- Modify: `web/src/server/adapters/auth/nextauth-config.ts`

- [ ] **Step 1: Write failing callback tests**

Use a `MemoryUserRepository` dependency to assert an OAuth callback replaces the
random incoming `token.sub` with the repository canonical ID, repeated and
cross-provider sign-ins resolve to the same ID, credentials preserve their fixed
local ID, and unversioned legacy OAuth JWTs return `null`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/adapters/auth/nextauth-config.test.ts
```

Expected: FAIL because callbacks currently copy `user.id`.

- [ ] **Step 3: Implement dependency-injected callbacks**

Create callbacks with lazy repository access. On OAuth sign-in, resolve a verified
email, call `upsertFromIdentity`, set canonical `token.sub`, `provider`, and
`identityVersion: 1`. Preserve fixed credentials IDs. Return `null` for legacy
unversioned OAuth JWTs so deleted UUIDs cannot be recreated.

- [ ] **Step 4: Verify GREEN**

Run the callback and existing device-auth tests. Expected: PASS.

### Task 6: Exact legacy-document cleanup

**Files:**
- Create: `web/scripts/delete-legacy-user-docs.mjs`

- [ ] **Step 1: Implement an allowlisted cleanup command**

The script loads the existing Next/Firebase environment, targets only the two
approved `users/{id}` paths, prints project/path information without secrets,
requires `--confirm`, deletes each document, and verifies both paths no longer
exist.

- [ ] **Step 2: Run dry mode**

```powershell
node web/scripts/delete-legacy-user-docs.mjs
```

Expected: list two paths and perform no deletion.

- [ ] **Step 3: Run confirmed cleanup**

```powershell
node web/scripts/delete-legacy-user-docs.mjs --confirm
```

Expected: both documents deleted and verification reports zero remaining.

### Task 7: Full verification and documentation sync

**Files:**
- Modify all Task 1 `.ai/` mirrors with final behavior and verification evidence.

- [ ] **Step 1: Run focused identity tests**

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test -- src/server/identity/canonical-user-id.test.ts src/server/adapters/auth/verified-oauth-email.test.ts src/server/adapters/auth/nextauth-config.test.ts src/server/adapters/memory/memory-user-repository.contract.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run web suite and type checker**

```powershell
corepack pnpm@9.12.0 --filter @spinshare/web test
corepack pnpm@9.12.0 --filter @spinshare/web lint
```

Expected: exit 0 with no failures.

- [ ] **Step 3: Run root regression suite**

```powershell
corepack pnpm@9.12.0 test
corepack pnpm@9.12.0 lint
```

Expected: exit 0 with no failures.

- [ ] **Step 4: Review the final diff**

Run `git diff --check` and `git status --short`; verify `.claude/settings.local.json`
remains untouched and only canonical-identity files changed.
