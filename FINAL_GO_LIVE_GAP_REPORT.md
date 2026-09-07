# Final Go-Live Gap Report — اسدزاده | Asadzedeh

**Date:** 2026-09-07 · **Audited commit:** `7281164` · **Branch:** `arena/01a07cbf-asadzedeh`

Scope note: this report lists **only** defects still present in the code at the
commit above. Items fixed by the previous hardening pass (npm ci peer conflict,
script top-level await, session expiry enforcement, certificate enumeration
throttle, SQL-level stock/seat reservation, payment idempotency guards) are not
repeated.

**Method:** every finding below was produced by reading the file named *and*, where
possible, by executing it. A new capability was added during this audit —
`embedded-postgres` (PostgreSQL **18.4**, verified with
`select current_setting('server_version')` → `18.4`) — so the concurrency and
restore claims can now be tested against a real server rather than PGlite.

---

## CRITICAL

### C1 — Paid-order finalisation is not one transaction
- **File:** `lib/order-payment.ts` (`finalizePaidOrder`), `app/api/payment/callback/route.ts`
- **Current behaviour:** `markPaymentPaid()` runs its own statement, `markOrderPaid()` another, then `settleOrderLines()` opens a separate transaction, then `writeDb({orders})` writes `settledAt`, then `grantAccessForOrder()` inserts enrolments in yet another transaction, then `audit()`.
- **Risk:** a crash or error between steps leaves `payment = PAID` with no enrolment, or `PAID` with stock never decremented. The requirement "payment PAID but enrollment missing" is currently reachable.
- **Required fix:** one `sql.transaction()` that flips payment, order, settles stock/seats, inserts enrolments and appends the audit row; anything thrown rolls the whole thing back. Side effects that must not roll back (SMS, `revalidatePath`) move outside.
- **Test required:** integration test that forces the enrolment step to fail and asserts the payment and order are still `pending`/`AWAITING_PAYMENT` afterwards.

### C2 — Ticket/chat persistence has a second authoritative store
- **File:** `server.mjs` lines 9–11, 23–40, 68–74, 176–178
- **Current behaviour:** Socket.IO handlers `readDb()`/`writeDb()` against `data/.store-wal.json` falling back to `data/db.json`. The Next app reads and writes tickets through PostgreSQL.
- **Risk:** messages written by the socket layer are never read back by the app, and the socket layer never sees tickets created through the app. Support chat silently loses history. Two writers on one JSON file can also truncate it.
- **Required fix:** move ticket reads/writes in `server.mjs` to PostgreSQL (the `postgres` driver is already a dependency), delete `DB_PATH`/`WAL_PATH` from that file.
- **Test required:** integration test that creates a ticket, appends a message via the same SQL path the socket uses, and reads it back through the store.

### C3 — Duplicate certificate issuance is possible
- **File:** `app/dashboard/actions.ts` (`setLessonProgress`)
- **Current behaviour:** `const existing = getCertificates().find(...)` then `writeDb({ certificates: [...] })`. Both the read and the write go through the in-memory cache; there is no unique index on `(user_id, course)`.
- **Risk:** two simultaneous "mark complete" requests both see no certificate and both insert one. The business rule "one certificate per user per course" is unenforced.
- **Required fix:** partial unique index `CREATE UNIQUE INDEX … ON certificates (user_id, course_title) WHERE revoked_at IS NULL` plus `INSERT … ON CONFLICT DO NOTHING`.
- **Test required:** two parallel issuance calls → exactly one row.

### C4 — The store still writes whole collections on every mutation
- **File:** `lib/store.ts` (`replaceTable`, `persist`)
- **Current behaviour:** `DELETE FROM <table> WHERE <pk> NOT IN (…)`, then one upsert per row, for `products`, `classes`, `orders`, `payments`, `enrollments`, `certificates`, `audit`, `tickets`, and more.
- **Risk:** correct for exactly one Node process. With two, each holds a stale array and the `NOT IN` delete removes the other's newly written rows. Also rewrites thousands of rows to change one.
- **Required fix:** row-level `INSERT/UPDATE/DELETE` for the write paths in critical flows (orders, payments, enrolments, certificates, tickets, audit). Reservation columns are already exempt.
- **Test required:** two independent store instances writing concurrently; assert no row disappears.

---

## HIGH

### H1 — Zod is used in exactly one place
- **Files:** `lib/env.ts` is the only importer of `zod`. Ad-hoc helpers remain in `app/admin/actions.ts:74,79,91`, `app/admin/actions/workshop.ts:23`, `app/admin/seo/actions.ts:20,58`, `app/instructor/actions.ts:12,16,20`, `app/instructor/course-requests/actions.ts:10,14,18`, plus raw `String(fd.get(...))` in `app/auth/actions.ts` and `app/checkout/actions.ts`.
- **Risk:** every mutation boundary parses by hand. Negative/zero/huge quantities, oversized strings and unexpected enum values are only caught where someone remembered to check.
- **Required fix:** domain schemas under `lib/validation/` (`auth.ts`, `checkout.ts`, `courses.ts`, `products.ts`, `seo.ts`, `support.ts`), each boundary doing `unknown → parse → typed value`.
- **Test required:** negative qty, zero qty, huge qty, unknown extra fields, oversized strings, bad enums, malformed redirect target.

### H2 — Five of six outbound HTTP calls have no timeout
- **Files:** `lib/payment.ts:38,81`, `lib/notify.ts:38,51`, `lib/neshan.ts:51`. Only `lib/spotplayer.ts:74` sets `AbortSignal.timeout(20_000)`.
- **Risk:** a hung Zarinpal or SMS endpoint holds a request (and a DB connection) open indefinitely. The payment callback is the worst case.
- **Required fix:** `AbortSignal.timeout()` on every outbound call; a small retry helper with backoff used only where the call is idempotent.
- **Test required:** unit test that a never-resolving fetch rejects within the timeout.

### H3 — Sentry is decorative
- **File:** `lib/monitoring.ts`
- **Current behaviour:** `captureException()` logs with Pino and issues `fetch("https://sentry.io/api/0/envelope/", { method: "HEAD" })`. Nothing is ever sent. `monitoringStatus()` reports `"configured"` purely from the presence of `SENTRY_DSN`. `/api/health` therefore reports a lie.
- **Required fix:** install `@sentry/nextjs`, initialise in `instrumentation.ts` and the client entry, wire `beforeSend` scrubbing, make `monitoringStatus()` reflect the real SDK.
- **Test required:** redaction test asserting password/cookie/authorization/apiKey never reach the payload.

### H4 — No IDOR regression coverage
- **Files:** `lib/__tests__/` contains no authorization tests.
- **Current behaviour:** ownership rules exist in `app/admin/actions.ts`, `app/instructor/actions.ts`, `app/dashboard/actions.ts`, but nothing fails if one is removed.
- **Risk:** silent privilege escalation on any future edit.
- **Required fix:** an IDOR suite — user A reading user B's order, instructor A editing instructor B's course, student calling an admin action, student issuing a certificate.
- **Test required:** the suite itself.

### H5 — Lesson progress accepts arbitrary lesson ids
- **File:** `app/dashboard/actions.ts` (`setLessonProgress`)
- **Current behaviour:** `lessonId` is added to `completed` without checking it belongs to `courseSlug`. Certificate eligibility is computed from the course's own lesson list, so a certificate cannot be forged — but the stored progress is unvalidated and the parameter is untyped.
- **Required fix:** reject lesson ids not present in the enrolled course; validate with Zod.
- **Test required:** submitting an unknown lesson id leaves progress unchanged.

---

## MEDIUM

### M1 — Runtime WAL persistence is still a read path
- **File:** `lib/store.ts` (`WAL_PATH`, `writeWal`, `ensureReady`)
- **Current behaviour:** every `writeDb` writes the whole DB to `data/.store-wal.json`; `ensureReady()` reads it back when the cache is cold.
- **Note:** `instrumentation.ts` already `await initStore()`s at boot, so the WAL is no longer needed as a cold-start path.
- **Required fix:** delete the WAL; PostgreSQL becomes the only store.
- **Test required:** boot with an empty cache and no WAL file; assert data comes from SQL.

### M2 — `npm run seo:audit` exits 1 on any ERROR, including soft ones
- **File:** `scripts/seo-audit.ts`
- **Current behaviour:** `process.exit(errors > 0 ? 1 : 0)`. "Missing title" on an instructor anchor and a genuinely broken canonical are the same severity.
- **Required fix:** split blocking from advisory; only blocking errors fail CI.
- **Test required:** a fixture with only advisory issues exits 0.

### M3 — Checkout does not detect a price or stock change since the cart was built
- **Files:** `app/checkout/actions.ts`, `components/checkout/CheckoutForm.tsx`
- **Current behaviour:** the server always charges the authoritative price (correct), but the shopper is never told the amount moved. Stock exhaustion mid-checkout surfaces as a redirect with a Persian error string, with no cart recovery path.
- **Required fix:** return a typed business error the UI can render; show "price changed from X to Y" before payment.
- **Test required:** unit test of the price-delta detection.

### M4 — Upload atomicity is not compensated
- **File:** `app/api/media/[...key]/route.ts`, `app/admin/actions.ts` (`uploadMedia`)
- **Current behaviour:** the object is written, then the DB record. If the DB write fails the object is orphaned; there is no cleanup.
- **Required fix:** delete the stored object when the record write fails.
- **Test required:** forced DB failure leaves no orphan key.

### M5 — `docker-compose.yml` is undocumented as dev-only
- **Required fix:** header comment plus a line in `docs/DEPLOY.md` stating cPanel production does not use Compose.

---

## LOW

### L1 — `resetDb()` exists behind an `isProduction()` throw
- **File:** `lib/store.ts`. Acceptable, but a stray `export` of a destructive function is worth removing from the public surface.

### L2 — Turbopack warning at `lib/store.ts` WAL read
- Resolved automatically by M1 (removing the WAL removes the dynamic `fs.readFileSync`).

---

## Verified as already correct (no action)

| Area | Evidence |
|---|---|
| Socket.IO authentication | `server.mjs` auth middleware rejects unauthenticated sockets before `io.on("connection")` |
| Socket room authorization | `ticket:join` re-checks `ticket.userId !== user.id` server-side; client-supplied room ids are not trusted |
| Socket abuse limits | 20 messages/60 s per socket, message body capped at 2000 chars |
| Graceful shutdown | `SIGTERM`/`SIGINT` → `httpServer.close()` with a 10 s hard deadline (does **not** yet close the DB pool — folded into C2) |
| Checkout price integrity | `lib/checkout-lines.ts` re-reads every price; 9 tests |
| Payment idempotency guards | conditional `UPDATE … WHERE status <> 'paid'` + `UNIQUE (gateway_transaction_id)`; 18 tests |
| Production demo-payment guard | `demoPaymentAllowed()` false in production unless `ALLOW_DEMO_PAYMENT=true` |
| Seed admin in production | `ensureSeedUsers()` returns early on `NODE_ENV=production`; `scripts/db-seed.ts` refuses |

---

## External blockers (cannot be closed in this repository)

| Item | Status |
|---|---|
| Zarinpal merchant id | **BLOCKED BY EXTERNAL CONFIGURATION** |
| S3 endpoint / bucket / keys | **BLOCKED BY EXTERNAL CONFIGURATION** |
| SpotPlayer API key | **BLOCKED BY EXTERNAL CONFIGURATION** |
| SMS provider API key | **BLOCKED BY EXTERNAL CONFIGURATION** |
| SMTP credentials | **BLOCKED BY EXTERNAL CONFIGURATION** |
| Sentry DSN | **BLOCKED BY EXTERNAL CONFIGURATION** (SDK installation is *not* blocked) |
| Playwright browser binary | **BLOCKED IN THIS SANDBOX** — `cdn.playwright.dev` unreachable (`Client network socket disconnected`). CI can install it. |
