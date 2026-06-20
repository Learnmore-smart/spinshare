# Canonical User Identity Design

## Problem

Auth.js runs with JWT sessions and no database adapter. During each OAuth sign-in,
Auth.js creates a random `user.id`; the current JWT callback copies that random UUID
to `token.sub`. Dashboard, device-token, ledger, and balance paths then use that UUID
as `users/{userId}`. Repeated sign-ins can therefore split one person's balance and
signup bonus across multiple anonymous Firestore documents.

Balance-only upserts compound the problem by creating documents without `id`,
`email`, or provider metadata. The existing two UUID documents are test data and may
be deleted rather than migrated.

## Goals

- Exactly one domain `users/{userId}` document for one person across repeated Google
  and GitHub sign-ins.
- Preserve a user's canonical ID when their provider email later changes.
- Merge a second provider into the same canonical user only when both providers
  supply the same normalized, verified email.
- Keep balances, held earnings, payout metadata, and creation time intact during
  identity refreshes.
- Make every newly authenticated user document identifiable in Firestore with an
  explicit `id`, `email`, `provider`, and linked-provider list.
- Reject legacy JWT identities so an old random UUID cannot recreate an orphan user
  after cleanup.

## Non-goals

- Automatically merging existing financial records whose ownership is ambiguous.
- Treating an unverified email as proof that two OAuth accounts belong to one person.
- Building a user-facing account-linking/settings interface in this change.

## Architecture

### Canonical user

The first verified email produces a stable canonical user ID:

`usr_` + SHA-256(`lowercase(trim(email))`)

The hash avoids exposing the email in the document path and does not depend on a
rotatable application secret. Firestore remains server-only under the current rules.
The canonical `users/{userId}` document stores the same `id` explicitly for console,
export, and debugging use, along with the current email, primary provider, linked
providers, role, balances, and timestamps.

### Persistent identity mapping

A separate server-only `userIdentities` collection maps a hashed
`provider:providerAccountId` key to the canonical user ID. Resolution is performed in
a Firestore transaction:

1. Read the provider-account mapping.
2. If it exists, use its canonical user ID even if the email changed.
3. If it does not exist, require a normalized verified email and derive the canonical
   ID from that email. This makes first-time Google and GitHub sign-ins with the same
   verified email converge on one user.
4. Upsert the canonical user metadata without replacing financial fields.
5. Create/update the identity mapping and add the provider to the linked-provider
   list.

If an existing mapping conflicts with another canonical identity, fail closed. The
system must never merge financial accounts merely because of inconsistent data.

### Auth.js integration

On an OAuth sign-in, the JWT callback sends the provider, provider account ID,
verified email, and role to `UserRepository.upsertFromIdentity()`. The returned
canonical user ID becomes `token.sub`, and therefore the browser session, device
token, ledger owner, balance owner, advertiser owner, and payout owner all share one
identifier.

Legacy JWTs have no durable proof that their stored email passed the new verification
boundary. They therefore fail closed and require one new sign-in. Local credentials
accounts retain their explicit stable IDs.

Google's verified-email claim is required. GitHub sign-in must use a verified email;
the provider integration will reject a profile when no verified email can be
established.

## Data model

`users/{canonicalUserId}` adds or guarantees:

- `id: string`
- `email: string`
- `provider: "google" | "github"`
- `providers: ("google" | "github")[]`
- existing role, balance, hold, payout, and timestamp fields

`userIdentities/{identityKey}` contains:

- `userId: string`
- `provider: "google" | "github"`
- `providerAccountId: string`
- `email: string`
- `createdAt`, `updatedAt`

## Cleanup

Delete these explicitly authorized test documents:

- `users/6217f46f-6a22-4ae8-94db-db9fce2e948d`
- `users/fa8e2f7e-6365-443b-ad45-10dcf4d24761`

Cleanup is narrowly scoped to those exact paths. Existing unrelated user and
financial records are untouched.

## Error handling

- Missing/unverified OAuth email: reject sign-in; do not create a user.
- Identity mapping conflict: reject sign-in and log a non-secret diagnostic.
- Firestore transaction failure: reject sign-in; do not issue a JWT with an
  unpersisted identity.
- Existing canonical user: merge identity metadata and preserve all financial data.

## Testing

- Unit-test email normalization and canonical ID stability.
- Repository contract: repeated identity upserts return one ID; Google and GitHub
  with the same verified email return one ID; email changes on an existing provider
  keep the original ID; financial fields survive metadata refresh.
- Auth callback test: `token.sub` receives the repository's canonical ID, not the
  random Auth.js UUID.
- Legacy JWT test: a signed token with a random UUID and no identity version is
  rejected so it cannot recreate the deleted document.
- Firestore emulator contract covers atomic identity mapping and user upsert.
- Run focused tests, full web tests, type checking, and the root regression suite.

## Rollout

1. Deploy the identity code.
2. Delete the two authorized UUID test documents.
3. Existing OAuth sessions are invalidated once and users sign in again.
4. Confirm a Google sign-in and repeated sign-in use the same document.
5. Confirm GitHub with the same verified email uses that same document.
