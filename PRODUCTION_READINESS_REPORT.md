# Production Readiness Report — اسدزاده | Asadzedeh

**Date:** 2026-09-08 · **Branch:** `arena/01a07cbf-asadzedeh` · **Base:** `5af42d8`

**Verdict: PARTIAL — ready for staging, NOT READY for real money.**

Every correctness gap found by the last two audits is now closed and covered by a
test that has actually run, including against a real PostgreSQL server. What
keeps this off "READY" is a single item: **the Playwright suite has never been
executed in a browser**, so checkout, login and admin flows have no runtime
coverage that has actually happened.

Ratings: **READY** = implemented *and* verified by a command run on 2026-09-08 ·
**PARTIAL** = implemented, with a named gap · **BLOCKED** = needs something
outside this repository.

---

## Commands run for this report

| Command | Result |
|---|---|
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` | 0 errors (`tsc --noEmit`, includes `e2e/` and `playwright.config.ts`) |
| `npm test` | **205 passed / 25 files** (was 78 / 14 at the last report) |
| `npm run build` | `✓ Compiled successfully`, 49 static pages |
| `npm run seo:audit` | `PASS` — 0 ERROR, 0 WARN (exit-code behaviour measured, see SEO) |
| `npm run smoke` | **36/36** against real PostgreSQL 18.4 on a production build |
| `npm run backup:verify` | 13 checks pass on a throwaway database |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm audit` (incl. dev) | 4 moderate, all via `drizzle-kit` (a build tool, not shipped). Fix requires downgrading to 0.18.1 — **deliberately not applied** |
| `npm run test:e2e` | **never run** — see Testing |

Runtime checks come from `scripts/smoke.ts` against `node server.mjs` on a real
PostgreSQL 18.4 cluster (UTF-8), on a `next build` output — not a dev server.

---

## Architecture — READY

Next.js App Router modular monolith on PostgreSQL. No microservices, no queue,
no Redis, no event sourcing. `lib/` holds the domain (commerce, validation,
storage, monitoring, backup); `app/` holds routes and server actions; `server.mjs`
adds the Socket.IO layer and graceful shutdown. Deployable to a single Node
process behind a reverse proxy — which is what low-cost Node/cPanel hosting
provides.

`docker-compose.yml` is labelled development-only at the top of the file.

---

## Database — READY

PostgreSQL is the single authoritative store. The JSON file and the write-ahead
log are both gone; there is no runtime `db.json`.

| Aspect | Status | Evidence |
|---|---|---|
| Migrations run | **READY** | `drizzle/0000…0003`; `npm run db:migrate` |
| Commerce atomicity | **READY** | Conditional UPDATEs + `FOR UPDATE`; `commerce.pg.test.ts` (15) |
| Multi-process writes | **READY** | Append-only tables no longer prune; `concurrent-writers.pg.test.ts` (7) |
| jsonb payloads | **READY** | Bound `::text::jsonb`; `payload-encoding.pg.test.ts` (4); migration 0003 repairs legacy rows |
| Backup + restore | **READY** | `backup-verify.pg.test.ts` (10), 6 of which require failure |
| Fail-fast without a DB | **READY** | `server.mjs` exits 1 without `DATABASE_URL` |

The concurrency and constraint tests run against PostgreSQL started from
`embedded-postgres`, initialised UTF-8/C.UTF-8. PGlite is single-connection and
cannot contend with itself, so it was never sufficient for these.

---

## Authentication — READY

Phone + password, hashed sessions, TOTP 2FA with `XXXX-XXXX` recovery codes.
Session validity distinguishes `unknown | revoked | expired | active`
(`session-state.test.ts`, 7).

**Action required before Go-Live:** `security.requireStaff2fa` ships `false`.
Set it to `true` or admin 2FA is implemented but not enforced.

**Known gap:** there is no password-reset flow. The `password_resets` table
exists and is unused. An admin must reset a forgotten password manually.

---

## Authorization — READY

`authorization.test.ts` (23) drives real server actions as specific users through
a Next-runtime double. It asserts action-level checks, not page-level guards: a
student cannot read another student's orders, an instructor cannot edit another
instructor's course, and each admin action enforces its own permission.

This suite also caught a real privilege escalation: `updateUserRole` accepted
`str(fd, "role")` with no allowlist, so any staff member could grant themselves
`super_admin`. `ASSIGNABLE_ROLES` now excludes it.

`/admin` renders an inline gate page (status 200, no redirect) and leaks nothing.
`/instructor` redirects unauthenticated visitors to `/auth?next=/instructor`.

---

## Payments — PARTIAL

| Aspect | Status |
|---|---|
| Finalisation is one transaction | **READY** — `finalizePaidOrderTx()`, order locked `FOR UPDATE` |
| Replay/duplicate callbacks | **READY** — 5 parallel callbacks → 1 effect |
| Client price never trusted | **READY** — `checkout-lines.test.ts` (15) |
| Price change is surfaced | **READY** — `priceChanges[]`, Persian-digit message |
| Demo payment off in production | **READY** — `demoPaymentAllowed()` |
| Outbound timeouts | **READY** — `lib/http.ts`, 30 s cap |
| Retries only on idempotent calls | **READY** — opt-in per call; verification retries, creation does not |
| **Zarinpal live gateway** | **BLOCKED BY EXTERNAL CONFIGURATION** — no merchant id. Never called for real. |
| Abandoned-order reconciliation | **READY** — `releaseExpiredReservations()` sweeps unpaid orders past the TTL under `FOR UPDATE SKIP LOCKED`. `reservation-expiry.pg.test.ts` (9). |

---

## Inventory — READY

Conditional `UPDATE … WHERE (stock - reserved_stock) >= $n` for products and
`… WHERE (remaining - reserved_seats) > 0` for class seats. Zero rows affected
means refused — the database decides, not an in-process mutex.

Verified under real parallel load: 25 concurrent buyers on stock 3 → exactly 3
succeed and stock never goes negative; 20 concurrent on 4 seats → exactly 4.
A `CHECK` constraint independently rejects negative stock and seats.

---

## Storage — PARTIAL

Local disk by default, S3-compatible when configured. Signed AWS Signature V4
PUT and DELETE share one signer.

| Aspect | Status |
|---|---|
| Upload extension safety | **READY** — derived from the declared MIME type, not the client filename |
| Failed upload rolled back | **READY** — the object is deleted if the follow-up write fails |
| Media deletion | **READY** — was deleting from `public/` while uploads live in `data/object-store/`; now correct |
| Key traversal | **READY** — `safeKey()` neutralises `..` and results stay inside the root |
| **S3 in production** | **BLOCKED BY EXTERNAL CONFIGURATION** — no endpoint/bucket/keys |

`storage.test.ts` (9).

---

## Video — PARTIAL

SpotPlayer licence issuance is implemented with a timeout and scrubbed logging.
**BLOCKED BY EXTERNAL CONFIGURATION** — no API key, so no licence has ever been
issued for real.

---

## Certificates — READY

`insertCertificateIfAbsent()` uses
`ON CONFLICT (user_id, course_title) WHERE revoked_at IS NULL DO NOTHING
RETURNING code`. Four parallel issuances produce exactly one certificate;
reissue after revoke succeeds.

---

## SEO — READY

`npm run seo:audit` → `PASS`, 0 ERROR / 0 WARN.

The exit-code contract was measured rather than assumed: injecting one ERROR
produces **exit 1** (CI fails), WARN-only produces **exit 0** (reported, does not
fail). Output carries the route for every finding.

The admin SEO dashboard does not crawl the site per request. robots.txt declares
`Sitemap: https://asadzedeh.ir/sitemap.xml`; the sitemap URL count is asserted
non-empty rather than pinned, since it tracks catalogue size. Vazirmatn
stays self-hosted — no runtime font CDN. CSP was not weakened to accommodate
embeds.

---

## Security — READY

| Aspect | Status | Evidence |
|---|---|---|
| Security headers | **READY** | 5 headers asserted **on real responses**, plus `x-powered-by` absent |
| CSRF | **READY** | Cross-origin Server Action rejected (500); smoke test confirms |
| Secret leakage | **READY** | Smoke test scans `/`, `/courses`, `/api/health`, `/auth` |
| Sentry scrubbing | **READY** | `sentry-scrub.test.ts` (10) — password, session token, cookies, 2FA secret, recovery code, `Authorization`, SMTP/SMS/payment secrets |
| Zod at every boundary | **READY** | `lib/validation/*`; `validation.test.ts` (23) |
| No secrets in Git | **READY** | No `NEXT_PUBLIC_*` secret; compose credentials are placeholders |
| Socket abuse limits | **READY** | 20 msg/60 s, 2000-char cap, `maxHttpBufferSize: 10_000` |
| Socket authorization | **READY** | Client room ids not trusted; ownership re-checked server-side |
| robots.txt is not access control | **READY** | Authorization stays server-side |
| **Sentry delivery** | **BLOCKED BY EXTERNAL CONFIGURATION** | SDK + scrubber installed and tested; no DSN |

---

## Observability — READY

Pino with normalized event names (`auth.login.success`, `payment.verified`,
`order.paid`, `inventory.reserved`, `certificate.issued`, `admin.role.changed`)
and correlation ids. `/api/health` reports liveness plus database kind, storage
configuration, monitoring status and the demo-payment flag.

Smoke-test baseline:
```json
{"status":"ok","db":"postgres","storage":"local","storageConfigured":false,
 "monitoring":{"sentry":"not configured","logging":"pino"},"demoPayment":true}
```
`demoPayment` is `true` only because the smoke test runs against a
non-production host.

---

## Testing — PARTIAL

`npm test` → **205 passed / 25 files**.

| File | Tests | Covers |
|---|---|---|
| `authorization.test.ts` | 23 | IDOR and action-level authorization |
| `validation.test.ts` | 23 | Zod schemas at every boundary |
| `commerce.integration.test.ts` | 18 | oversell, capacity, rollback, idempotency |
| `checkout-lines.test.ts` | 15 | tampered price/title/qty; price-change detection |
| `commerce.pg.test.ts` | 15 | real PostgreSQL contention and constraints |
| `backup-verify.pg.test.ts` | 10 | restore verification; 6 require failure |
| `sentry-scrub.test.ts` | 10 | secret scrubbing |
| `storage.test.ts` | 9 | upload safety and cleanup |
| `learning-path-pricing.test.ts` | 8 | bundle pricing |
| `http.test.ts` | 7 | timeouts and bounded retries |
| `session-state.test.ts` | 7 | expired/revoked/unknown sessions |
| `stock.test.ts` | 7 | availability arithmetic |
| `concurrent-writers.pg.test.ts` | 7 | append-only tables survive a second writer |
| `reservation-expiry.pg.test.ts` | 9 | expired reservations reclaimed; paid orders never swept |
| `auth.test.ts` | 6 | hashing and login |
| `auth-navigation.test.ts` | 5 | redirect handling |
| `order-status.test.ts` | 4 | order state transitions |
| `payload-encoding.pg.test.ts` | 4 | jsonb not double-encoded |
| `store-bootstrap.test.ts` | 4 | boot race and per-process singleton |
| `permissions.test.ts` | 3 | role matrix |
| `redirect-validation.test.ts` | 3 | open-redirect rejection |
| `seo-fallback.test.ts` | 3 | metadata fallbacks |
| `certificate-code.test.ts` | 2 | code format |
| `money.test.ts` | 2 | Toman/Rial conversion |
| `rate-limit.test.ts` | 1 | limiter |

Four suites (`commerce.pg`, `backup-verify.pg`, `concurrent-writers.pg`,
`payload-encoding.pg` — 36 of the 205 tests) are **not** excluded from a bare
`npm test`: `vitest.config.ts` includes `**/*.test.ts` with no filter, and each
of those files boots its own throwaway PostgreSQL cluster from the
`embedded-postgres` dev dependency. So a plain `npm test` does exercise real
PostgreSQL — provided those binaries install, which is why CI must have them.

**BLOCKED — Playwright E2E.** `e2e/` holds 5 specs (student journey, store
journey, admin journey, security regressions including price tampering) plus
`playwright.config.ts` and a global setup that builds a disposable database. It
typechecks. It has **never executed**: `npx playwright install chromium` fails in
this sandbox with `Client network socket disconnected before secure TLS
connection was established` against `cdn.playwright.dev`, and no system Chromium
is present. Run `npm run test:e2e:install && npm run test:e2e` on a machine with
browser access. **Do not treat it as passing.**

---

## CI/CD — PARTIAL

The workflow is at **`ci/ci.yml`**, not `.github/workflows/`. Pushing to
`.github/workflows/` is rejected by the GitHub App token this session uses
(missing `workflows` scope). Copy it into place with a token that has that scope.

The workflow runs lint, typecheck, test, build and `seo:audit`, and exits
non-zero on any SEO ERROR.

---

## What is still missing

1. **Playwright E2E has never run.** The only item keeping the verdict off READY.
2. **No password-reset flow.** `password_resets` is an unused table.
4. **Six integrations are unconfigured** — Zarinpal, S3, SpotPlayer, SMS, SMTP, Sentry DSN.
5. **`security.requireStaff2fa` is `false`** in the shipped seed.

---

## External credentials required

| Integration | Status |
|---|---|
| PostgreSQL | **READY** — migrations and commerce queries have run against PostgreSQL 18.4 |
| Zarinpal merchant id | **BLOCKED BY EXTERNAL CONFIGURATION** |
| S3-compatible object storage | **BLOCKED BY EXTERNAL CONFIGURATION** — local fallback active |
| SpotPlayer API key | **BLOCKED BY EXTERNAL CONFIGURATION** |
| SMS provider | **BLOCKED BY EXTERNAL CONFIGURATION** |
| SMTP | **BLOCKED BY EXTERNAL CONFIGURATION** — demo mode logs instead of sending |
| Sentry DSN | **BLOCKED BY EXTERNAL CONFIGURATION** — SDK installed and tested |

None of these is marked READY. No real call to any of them has succeeded, and
marking an unexercised integration READY would be false.

---

## Bottom line

**Safe to deploy to staging** with a real PostgreSQL instance, real object
storage and test gateway credentials, to exercise what could not be exercised
here.

**Not safe to take real money until:**
1. the Playwright suite has passed once in a browser;
2. Zarinpal credentials are configured and a live payment has been verified
   end-to-end;
3. `security.requireStaff2fa` is `true` and seeded admin credentials are changed;
4. a restore has been rehearsed with `npm run backup:verify`;
5. an RPO is chosen and the dump schedule or WAL archiving that achieves it is
   actually running.

Items 1 and 5 are the substantive ones. The correctness work — atomic inventory,
atomic capacity, transactional finalisation, idempotent callbacks, server-side
pricing, authorization, restore verification — is done and tested.
