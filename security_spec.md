# MINES AI - Security Specification

## 1. Data Invariants
1. A Game document must always belong to the authenticated user (`resource.data.userId == request.auth.uid`).
2. A CellResult document must reference a valid game owned by the user and have its `userId` match the authenticated user.
3. A TrainingSample must belong to the authenticated user (`userId == request.auth.uid`).
4. AppSettings are uniquely mapped to `userId == request.auth.uid` and each user can only read/write their own settings document.
5. All reads, queries, and mutations strictly require user authentication (`request.auth != null`). No user may read, list, update, or delete records belonging to another user.
6. Board size is strictly 5 (5x5 grid = 25 cells), mineCount between 1 and 24, cell position between 0 and 24.
7. Cell results are restricted to valid enum values: `OCULTA`, `SEGURA`, `MINA`, `COFRE`, `DESCONOCIDA`.

## 2. The Dirty Dozen Payloads (Designed to break Identity, Integrity, and State)
1. **Payload 1 (Ghost Write / Privilege Hijack)**: Unauthenticated write to `/games/game123` with arbitrary state. Expectation: `PERMISSION_DENIED`.
2. **Payload 2 (Cross-User Game Steal)**: User B attempts to read `/games/gameA` owned by User A. Expectation: `PERMISSION_DENIED`.
3. **Payload 3 (Cross-User List Scraping)**: User B attempts to query `/games` without filtering by their own `userId`. Expectation: `PERMISSION_DENIED`.
4. **Payload 4 (Spoofed Creator ID)**: User A attempts to create a game specifying `userId: 'userB'`. Expectation: `PERMISSION_DENIED`.
5. **Payload 5 (Illegal Board Dimension)**: User attempts to write a game with `boardSize: 99` or `mineCount: 999`. Expectation: `PERMISSION_DENIED`.
6. **Payload 6 (Cell Position Overflow)**: User attempts to create a cell result with `position: 25` or `position: -1`. Expectation: `PERMISSION_DENIED`.
7. **Payload 7 (Invalid Cell Result Enum)**: User attempts to store `result: 'SUPER_SAFE_PREDICTION'` (hallucinated prediction state). Expectation: `PERMISSION_DENIED`.
8. **Payload 8 (Foreign Cell Injection)**: User A creates a cell result pointing to User B's game. Expectation: `PERMISSION_DENIED`.
9. **Payload 9 (Cross-User Training Poisoning)**: User A attempts to mutate User B's training samples in `/training_samples`. Expectation: `PERMISSION_DENIED`.
10. **Payload 10 (Settings Override)**: User A attempts to overwrite `/app_settings/userB`. Expectation: `PERMISSION_DENIED`.
11. **Payload 11 (Denial of Wallet Junk Characters)**: Write with ID greater than 128 characters or special illegal characters. Expectation: `PERMISSION_DENIED`.
12. **Payload 12 (Direct PII Leak)**: Unauthenticated user attempting to query `/users`. Expectation: `PERMISSION_DENIED`.
