# Go-Live Checklist

Every item is marked **DONE**, **BLOCKED** or **NOT REQUIRED**, with the evidence
behind the mark. Nothing is marked DONE on the strength of code being written —
only on a test that ran or a command that produced the stated output.

Verification run for this checklist (2026-09-15): `lint` 0 errors ·
`typecheck` 0 errors · `vitest run` **325 passed / 34 files** · `build` compiled
(47 routes) · `seo:audit` 0 ERROR 0 WARN · `npm audit --omit=dev` 0 vulnerabilities ·
`smoke` **36/36** · `security-audit` **66/66** · `scenario-test` **16/16** ·
`load-test` 1226 req, p95 462 ms, 0 errors — all against a **production-mode
server** (`NODE_ENV=production node server.mjs`) on real PostgreSQL.

Full findings and severity ratings: `PRODUCTION_READINESS_REPORT.md`.

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
| Admin 2FA | **DONE** | TOTP + recovery codes implemented and tested. Enforced in code for production: `staffMfaRequired()` returns `true` when `NODE_ENV=production` regardless of the stored setting, so a deployment cannot run with staff 2FA off. `staff-mfa-policy.test.ts` (9). |
| Production does not support demo payment | **DONE** | `demoPaymentAllowed()` returns false in production unless `ALLOW_DEMO_PAYMENT=true`. Smoke test asserts `demoPayment=true` only because it runs against a non-production host. |
| Production secrets not exposed | **DONE** | `sentry-scrub.test.ts` (10) asserts password, session token, cookies, 2FA secret, recovery code, `Authorization` and SMTP/SMS/payment secrets are stripped. Smoke test scans `/`, `/courses`, `/api/health`, `/auth` for secret leakage. No `NEXT_PUBLIC_*` secret. |
| Authorization regression tests pass | **DONE** | `authorization.test.ts` 23/23 — action-level, not page-level. |
| Backup can be restored | **DONE** | `backup:verify` runs 13 checks against a throwaway database. `backup-verify.pg.test.ts` 10/10, of which 6 corrupt the restore and require failure. |
| Production build succeeds | **DONE** | `npm run build` → compiled successfully, 49 static pages. |
| Playwright E2E ran | **BLOCKED** | `cdn.playwright.dev` unreachable (TLS `ECONNRESET`); apt and npm mirrors blocked too. The HTTP scenario suite (`scripts/scenario-test.ts`, 16/16) covers the same flows without a browser. **Must run in CI before Go-Live.** |
| Demo profiles cannot sign in | **DONE** | Retired at production boot (4 accounts disabled, sessions revoked, audited) and refused by `demoAccountBlocked()`. Scenario suite: all five published demo logins → `303 /auth?error=invalid`, no session. `auth.test.ts` (9), `launch-check.test.ts` (7). |
| A real administrator can be created | **DONE** | `db:bootstrap-admin` judges admins by "not disabled and not on the seeded password", so it works on a database that still holds the seed. Verified: created, idempotent on re-run, refuses a second phone once a usable admin exists. |
| Certificates are not readable by strangers | **DONE** | `lib/certificate-access.ts`; PDF and dashboard page answer 404 to a non-owner. `certificate-access.test.ts` (7) + anonymous checks in the security audit. |
| Payment gateway configured | **BLOCKED** | Zibal boundary implemented and wire-format tested (7 cases). **Needs `ZIBAL_MERCHANT` and one live transaction.** |
| SMS panel configured | **BLOCKED** | MeliPayamak boundary implemented and wire-format tested (6 cases). **Needs credentials and one real code delivery.** |
| Backup restore rehearsed | **BLOCKED** | No `pg_dump` in this sandbox. Run `npm run backup:verify -- --dump <file>` on the server. |

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

1. ~~Set `security.requireStaff2fa` to `true`.~~ **No longer an operator action** —
   production enforces staff 2FA in code. The setting only affects development
   and staging.
2. **Set `DATABASE_URL`** to the production PostgreSQL. The server exits without it.
3. **Set `NEXT_PUBLIC_APP_URL`** — required for the canonical base and payment callbacks.
4. **Set `APP_SECRET`** to a real random value (`openssl rand -hex 32`).
5. **Set the launch integrations** — `ZIBAL_MERCHANT`, `MELIPAYAMAK_USERNAME`,
   `MELIPAYAMAK_PASSWORD`. See `docs/PAYMENT.md` and `docs/SMS.md`.
6. **Create the real administrator** — `npm run db:bootstrap-admin`. The seeded
   admin is refused while it keeps the published password; this is the command
   that replaces it.
7. **Retire the demo profiles explicitly** (optional — the server also does it at
   boot) — `npm run db:disable-demo`.
8. **Choose the RPO.** A daily dump gives 24 h. A 5-minute RPO requires streaming
   replication or WAL archiving — see `docs/BACKUP.md`.
9. **Rehearse a restore** with `npm run backup:verify -- --dump <latest>`.

---

## Launch runbook

Run in this order. Each step has a command that proves it.

```bash
# 1. Install and build from the lockfile
npm ci
npm run build

# 2. Schema
npm run db:migrate

# 3. Real administrator (never the seeded one)
SUPER_ADMIN_PHONE=09... SUPER_ADMIN_PASSWORD='...' npm run db:bootstrap-admin

# 4. Retire demo profiles explicitly
npm run db:disable-demo -- --dry-run     # read what it would do
npm run db:disable-demo

# 5. Start
NODE_ENV=production node server.mjs
#   the boot log must show no launch.check error; ADMIN_LOCKED_OUT means step 3
#   did not happen

# 6. Prove the integrations are wired (no credential is echoed)
curl -s "$NEXT_PUBLIC_APP_URL/api/health" | jq '.integrations, .commerceReady'

# 7. Prove the deploy
npm run smoke       -- --base "$NEXT_PUBLIC_APP_URL"
npm run security:audit -- --base "$NEXT_PUBLIC_APP_URL"
npm run test:scenarios -- --base "$NEXT_PUBLIC_APP_URL" \
    --admin-phone 09... --admin-password '...' --allow-remote
npm run load -- --base "$NEXT_PUBLIC_APP_URL" --concurrency 20 --seconds 30

# 8. One real payment, one real SMS code — the two checks no test can replace
```

---

## Verdict

**⚠️ CONDITIONALLY READY.**

Everything this repository can verify on its own passes: 325 tests, a 36-check
smoke test, a 66-check HTTP security audit, a 16-check scenario suite and a load
probe — all against a production-mode server on real PostgreSQL. Nine findings
from this pass are FIXED and VERIFIED, including one CRITICAL certificate IDOR.

Three conditions remain, none of them a code defect:

1. live Zibal and MeliPayamak credentials plus one real round trip each;
2. the Playwright suite green once in a browser (CI job `e2e`);
3. a rehearsed restore (`npm run backup:verify`).

S3, SpotPlayer, SMTP and the Sentry DSN remain optional integrations: their
boundaries are implemented and tested, and none of them blocks launch.

Details, severities and reproduction steps: `PRODUCTION_READINESS_REPORT.md`.
