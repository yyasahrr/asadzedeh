# Go-Live Checklist

Every item is marked **DONE**, **BLOCKED** or **NOT REQUIRED**, with the evidence
behind the mark. Nothing is marked DONE on the strength of code being written —
only on a test that ran or a command that produced the stated output.

Verification run for this checklist: `lint` 0/0 · `typecheck` 0 errors ·
`vitest run` **205 passed / 25 files** · `build` compiled (49 static pages) ·
`seo:audit` PASS · `smoke` **36/36** against real PostgreSQL 18.4.

---

## Go / No-Go criteria

These are the conditions that must hold. If any fails, the answer is NOT READY.

| Criterion | Status | Evidence |
|---|---|---|
| Inventory cannot oversell | **DONE** | Conditional `UPDATE … WHERE (stock - reserved_stock) >= $n`. `commerce.pg.test.ts`: 25 parallel on stock 3 → exactly 3 wins, `stock >= 0`; `stock = -1` rejected by CHECK. |
| Capacity cannot overbook | **DONE** | Conditional `UPDATE … WHERE (remaining - reserved_seats) > 0`. 20 parallel on 4 seats → exactly 4. |
| Callback cannot duplicate effects | **DONE** | 5 parallel callbacks → 1; shared `gateway_transaction_id` → 1. `UPDATE … WHERE status <> 'paid'` + UNIQUE constraint. |
| Checkout does not trust client price | **DONE** | `buildLines()` re-reads every price. `checkout-lines.test.ts`: a cart posting `price: 1` is charged the catalogue price (15 tests). |
| Critical writes do not depend on JSON/WAL | **DONE** | WAL removed. `server.mjs` refuses to boot without `DATABASE_URL`. No `STORE_WAL_PATH` anywhere in the tree. |
| Admin 2FA | **DONE, but see note** | TOTP + recovery codes implemented and tested. **`security.requireStaff2fa` is `false` in the seed.** Set it to `true` in production before Go-Live — see [Configuration](#configuration-required-before-go-live). |
| Production does not support demo payment | **DONE** | `demoPaymentAllowed()` returns false in production unless `ALLOW_DEMO_PAYMENT=true`. Smoke test asserts `demoPayment=true` only because it runs against a non-production host. |
| Production secrets not exposed | **DONE** | `sentry-scrub.test.ts` (10) asserts password, session token, cookies, 2FA secret, recovery code, `Authorization` and SMTP/SMS/payment secrets are stripped. Smoke test scans `/`, `/courses`, `/api/health`, `/auth` for secret leakage. No `NEXT_PUBLIC_*` secret. |
| Authorization regression tests pass | **DONE** | `authorization.test.ts` 23/23 — action-level, not page-level. |
| Backup can be restored | **DONE** | `backup:verify` runs 13 checks against a throwaway database. `backup-verify.pg.test.ts` 10/10, of which 6 corrupt the restore and require failure. |
| Production build succeeds | **DONE** | `npm run build` → compiled successfully, 49 static pages. |
| Playwright E2E ran | **BLOCKED** | Browsers cannot be downloaded in this sandbox. **Must run in CI before Go-Live.** |

---

## Mandated implementation order

### 1. Atomic inventory — **DONE**
`lib/db/commerce.ts`. Product reservation is a conditional UPDATE; 0 rows
affected means refused. Evidence: `commerce.pg.test.ts` (15).

### 2. Atomic class capacity — **DONE**
Same file, seat path. Evidence: same suite.

### 3. Transactional payment/order finalisation — **DONE**
`finalizePaidOrderTx()` locks the order `FOR UPDATE`, short-circuits on
`settled_at || released_at`, returns `finalized | already-finalized | not-found`.
SMS, `revalidatePath`, SpotPlayer licence and `audit()` run *outside* the
transaction, so a notification failure cannot roll back a paid order.
Evidence: 3 parallel finalisations → 1; FK violation rolls back.

### 4. Concurrency + idempotency tests — **DONE**
Real parallel connections against PostgreSQL 18.4, not sequential simulation.
PGlite is single-connection and cannot contend with itself, so
`lib/__tests__/helpers/pg.ts` boots a real cluster (UTF-8, not the SQL_ASCII
default).

### 5. Remove legacy JSON/WAL persistence — **DONE**
No runtime `db.json`, no WAL. PostgreSQL is the single authoritative store.
`scripts/db-migrate-json.ts` remains as a one-time import tool.

### 6. Socket.IO on PostgreSQL + authorization — **DONE**
`server.mjs` uses the `postgres` package directly (it cannot import `@/lib/db/*`
— TypeScript and path aliases). Auth middleware rejects unauthenticated sockets;
`ticket:join` re-checks ownership server-side; client room ids are not trusted;
20 messages/60 s per socket; 2000-char cap.

### 7. Complete Zod validation — **DONE**
`lib/validation/{schema,form,auth,admin,legacy}.ts`, replacing ad-hoc
`str()/num()/bool()`. Closed a real privilege escalation in `updateUserRole`
(no role allowlist → any staff member could grant `super_admin`).
Evidence: `validation.test.ts` (23).

### 8. Authorization/IDOR regression tests — **DONE**
`authorization.test.ts` (23) via `lib/__tests__/helpers/next-runtime.ts`.

### 9. Playwright E2E — **BLOCKED**
`playwright.config.ts` and 5 specs written, typechecked, never executed.
`npx playwright install chromium` fails: `cdn.playwright.dev` is unreachable
from this sandbox (TLS socket disconnect). **Do not mark READY until a browser
has actually run these in CI.**

### 10. Sentry integration — **DONE (SDK), BLOCKED (delivery)**
`@sentry/nextjs` installed with server/edge/client configs and a `beforeSend`
scrubber. `sentry-scrub.test.ts` (10). **Delivery is BLOCKED BY EXTERNAL
CONFIGURATION** — no DSN.

### 11. Backup restore verification — **DONE**
`scripts/verify-backup-restore.ts` → `npm run backup:verify`. Throwaway
database named `asadzedeh_restore_*`, `pg_restore` with a `psql` fallback, 13
checks, dropped afterwards unless `--keep`. `assertRestorableUrl()` rejects
anything containing `prod|production|live|asadzedeh.ir`.
Check 13 is that **no live session survives** a restore.
Evidence: `backup-verify.pg.test.ts` (10).

### 12. Production smoke tests — **DONE**
`scripts/smoke.ts` → `npm run smoke`, **36/36**. Read-only: never logs in, never
creates an order, never initiates a paid transaction. Covers health, 11 public
pages, 5 security headers, `x-powered-by` absence, authorization, CSRF, secret
leakage, robots/sitemap, built assets.
**This is what found three real defects** — see the gap report.

### 13. Docs cleanup — **DONE**
`docs/{DEPLOY,ENV,SECURITY,SEO,BACKUP,DATABASE,PAYMENT}.md` plus
`docs/backup-restore.md`. `docker-compose.yml` labelled dev-only. RPO/RTO stated
as operational targets. Removed the reference to the deleted WAL file.

### 14. Final Go-Live report — **DONE**
`FINAL_GO_LIVE_GAP_REPORT.md` and this file.

---

## Other hardening items

| Item | Status | Evidence |
|---|---|---|
| Row-level writes on critical paths | **DONE** | C4 — append-only tables no longer prune. `concurrent-writers.pg.test.ts` (7). |
| Abandoned-order reservations reclaimed | **DONE** | `releaseExpiredReservations()` sweeps unpaid orders past the TTL under `FOR UPDATE SKIP LOCKED`; paid orders are never touched. `reservation-expiry.pg.test.ts` (9). |
| Smoke test runs in CI | **DONE** | `smoke` job in `ci/ci.yml` — PostgreSQL service, migrate, seed, build, real server, 36 checks. Rehearsed against a fresh empty database: 36/36. |
| `seo:audit` exit code | **DONE** | ERROR → exit 1, WARN-only → exit 0, both measured by injecting a finding. |
| Price-changed UX at checkout | **DONE** | M3 — `checkout-lines.test.ts` (15). |
| Sold-out UX at checkout | **DONE** | `buildLines()` reports capacity and stock exhaustion; reservation failures surface a message. |
| Upload atomicity + cleanup | **DONE** | M4 — `storage.test.ts` (9). |
| Timeouts + bounded retries on idempotent calls only | **DONE** | `lib/http.ts`; retries are opt-in per call. `http.test.ts` (7). |
| Certificate issuance concurrency-safe | **DONE** | `insertCertificateIfAbsent()`; 4 parallel → 1. |
| Lesson progress verifies enrolment | **DONE** | H5. |
| Security headers on real responses | **DONE** | Asserted by the smoke test, not by config inspection. |
| Production env fail-fast | **DONE** | `server.mjs` exits 1 without `DATABASE_URL`. |
| No seed credentials in production | **DONE** | `ensureSeedUsers()` returns early on `NODE_ENV=production`. |
| `/api/health` liveness/readiness | **DONE** | Reports db kind, storage, monitoring, demo-payment flag. |
| Normalized Pino event names | **DONE** | `auth.login.success`, `payment.verified`, `order.paid`, `inventory.reserved`, `certificate.issued`, `admin.role.changed`, plus correlation ids. |
| `server.mjs` graceful shutdown | **DONE** | `io.close()` → `httpServer.close()` → `sql.end({timeout:5})`, 10 s force-exit. |
| Docs/compose/package.json agree on architecture | **DONE** | All describe a Next.js modular monolith on PostgreSQL; compose is labelled dev-only. |

---

## Configuration required before Go-Live

These are operator actions, not code changes.

1. **Set `security.requireStaff2fa` to `true`.** It ships `false`. Without it,
   admin 2FA is implemented but not enforced.
2. **Set `DATABASE_URL`** to the production PostgreSQL. The server exits without it.
3. **Set `NEXT_PUBLIC_APP_URL`** — required for the canonical base and payment callbacks.
4. **Set `APP_SECRET`** to a real random value.
5. **Change or remove the seeded admin password** and set real staff passwords.
6. **Choose the RPO.** A daily dump gives 24 h. A 5-minute RPO requires streaming
   replication or WAL archiving — see `docs/BACKUP.md`.
7. **Rehearse a restore** with `npm run backup:verify -- --dump <latest>`.

---

## Verdict

**NOT READY** — solely because Playwright E2E has never executed in a browser.

Everything the repository can verify on its own passes: 205 tests, a 36-check
smoke test against real PostgreSQL, a verified restore path, clean lint,
typecheck and build. The moment the E2E suite runs green in CI, and the
configuration list above is completed, the verdict becomes READY.

Six integrations (Zarinpal, S3, SpotPlayer, SMS, SMTP, Sentry DSN) remain
**BLOCKED BY EXTERNAL CONFIGURATION**. Their boundaries are implemented and
tested; they are not marked READY and must not be, because no real call has
succeeded.
