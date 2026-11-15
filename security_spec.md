# SELLVION Firestore Security Specification & Payload-First TDD

## 1. Data Invariants

1. **Identity & Verified Email Invariant**: Every write operation (create, update, delete) requires a signed-in user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
2. **Path & Ownership Integrity**:
   - `/users/{userId}/public/{docId}` and `/users/{userId}/private/{docId}` require `request.auth.uid == userId` for writes; PII under `private` is strictly restricted to the owning user or an admin.
   - `/workspaces/{workspaceId}` can only be created with `incoming().ownerId == request.auth.uid`, `incoming().id == workspaceId`, and `createdAt == request.time && updatedAt == request.time`.
   - Subcollections `/workspaces/{workspaceId}/customers/{customerId}` and `/workspaces/{workspaceId}/draftRevisions/{revisionId}` MUST pass the Master Gate: `get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.ownerId == request.auth.uid` on single-document operations (`get`, `create`, `update`, `delete`).
   - `list` queries on `/workspaces`, `/workspaces/{workspaceId}/customers`, and `/workspaces/{workspaceId}/draftRevisions` MUST evaluate `resource.data.ownerId == request.auth.uid` directly without any `get()` or `exists()` calls.
3. **Immutable Ownership & Timestamps**:
   - `id`, `ownerId`, `workspaceId`, and `createdAt` are immortal after creation (`incoming().field == existing().field`).
   - Every create enforces `createdAt == request.time && updatedAt == request.time`; every update enforces `updatedAt == request.time`.
4. **Anti-Update-Gap & Zero Ghost Fields**:
   - All `isValid[Entity]` helpers enforce `hasAll` + `hasOnly`, strict primitive types, enum membership, `pattern` regex guards, and `.size()` bounds matching `firebase-blueprint.json`.
   - Updates are strictly partitioned into explicit named actions using `incoming().diff(existing()).affectedKeys().hasOnly([...])` wrapped inside `isValid[Entity](incoming())`.
5. **Terminal State Locking for Draft Revisions**:
   - Once a `DraftRevision` reaches `'approved'` or `'rejected'`, non-admin users cannot mutate its `status` or `message`.
6. **Admin Isolation**:
   - Client SDKs cannot write `/admins/{userId}` to self-escalate privileges. Bootstrapped admin (`ishayadav1291@gmail.com`) requires `request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Expected Result |
|---|---------------|-------------|-----------------|
| 1 | Unverified email spoof trying to claim admin | `/workspaces/ws_1` | `PERMISSION_DENIED` |
| 2 | Identity spoofing (`ownerId` != `request.auth.uid`) | `/workspaces/ws_1` | `PERMISSION_DENIED` |
| 3 | Ghost field injection (`isVerified: true`) | `/workspaces/ws_1` | `PERMISSION_DENIED` |
| 4 | Unrelated user reading victim PII | `/users/victim_uid/private/info` | `PERMISSION_DENIED` |
| 5 | Client-spoofed `createdAt` timestamp | `/workspaces/ws_1` | `PERMISSION_DENIED` |
| 6 | Cross-tenant customer creation in another user's workspace | `/workspaces/victim_ws/customers/c1` | `PERMISSION_DENIED` |
| 7 | Blanket unscoped `list` query on `workspaces` | `/workspaces` | `PERMISSION_DENIED` |
| 8 | Path ID poisoning (oversized / illegal characters in docId) | `/workspaces/ws_bad$id!` | `PERMISSION_DENIED` |
| 9 | Value poisoning (10KB `name` string exceeding `maxLength: 140`) | `/workspaces/ws_1` | `PERMISSION_DENIED` |
| 10 | Immortal `ownerId` mutation during workspace update | `/workspaces/ws_1` | `PERMISSION_DENIED` |
| 11 | Mutating a terminal `'approved'` `DraftRevision` back to `'edited'` | `/workspaces/ws_1/draftRevisions/rev_1` | `PERMISSION_DENIED` |
| 12 | Self-granting admin role in `/admins/{uid}` | `/admins/attacker_uid` | `PERMISSION_DENIED` |

## 3. Running Rules Tests

- Static ESLint verification: `npx eslint firestore.rules`
- Unit tests against Firestore Emulator: `npx vitest run firestore.rules.test.ts` (when Firestore Emulator is running on port 8080)
