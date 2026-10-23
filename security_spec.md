# Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Authentication & Verification**: All reads and writes to `/conversations/{conversationId}` and `/messages/{messageId}` require an authenticated user (`request.auth != null`) with a verified Google email (`request.auth.token.email_verified == true`).
2. **Ownership Isolation**: A user can only read, list, create, update, or delete conversations and messages where `userId == request.auth.uid`.
3. **Relational Integrity (Master Gate)**: A message in `/messages/{messageId}` can only be created if its parent `/conversations/{conversationId}` exists and belongs to `request.auth.uid`.
4. **Immutable Identity & Creation Metadata**: `id`, `userId`, `conversationId`, `createdAt`, and `clientCreatedAt` cannot be modified after creation.
5. **Temporal Integrity**: `createdAt` and `updatedAt` must always equal `request.time` upon creation, and `updatedAt` must equal `request.time` upon update.
6. **Strict Schema & Volumetric Boundaries**: Every string and optional list/map field is bounded by maximum size limits and strict key allowlists (`hasOnly`).

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Creating a conversation with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating a conversation where `request.auth.token.email_verified == false` -> `PERMISSION_DENIED`.
3. **Cross-User Identity Spoofing**: Creating a conversation with `userId: "victim-uid"` when `request.auth.uid == "attacker-uid"` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection (Create)**: Creating a conversation with an undeclared field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection (Update)**: Updating a conversation with an undeclared field `hacked: 1` -> `PERMISSION_DENIED`.
6. **Ownership Transfer Attack**: Updating an existing conversation's `userId` to another user -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: Creating or updating a conversation with a past or future `updatedAt` timestamp (`updatedAt != request.time`) -> `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: Creating a document with a 500-character or special-character document ID -> `PERMISSION_DENIED`.
9. **Denial-of-Wallet Oversized Payload**: Creating a message with `text` exceeding 100,000 characters -> `PERMISSION_DENIED`.
10. **Orphaned Message Write**: Creating a message whose `conversationId` does not exist in `/conversations` -> `PERMISSION_DENIED`.
11. **Cross-Tenant Message Injection**: Creating a message referencing a `conversationId` owned by another user -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Listing `/conversations` or `/messages` without filtering by `userId == request.auth.uid` -> `PERMISSION_DENIED`.
