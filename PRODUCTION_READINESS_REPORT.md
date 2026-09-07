# Production Readiness Report — اسدزاده | Asadzedeh

**Date:** 2026-09-07 · **Branch:** `arena/01a07cbf-asadzedeh` · **Commit base:** `5af42d8`

**Verdict: NOT production-ready.** The commerce, session and payment-integrity
gaps from the previous audit are now closed and covered by tests. What remains
is one untested-at-runtime area (E2E), one unwritten feature (password reset),
one stale subsystem (Socket.IO tickets), and credentials this repository cannot
supply.

Ratings below use: **READY** = implemented *and* verified by a command run on
2026-09-07 · **PARTIAL** = implemented, with a named gap · **BLOCKED** = needs
something outside this repository.

## Commands run for this report

| Command | Result |
|---|---|
| `npm ci` | success (534 packages) — **previously failed** on an `@types/node` peer conflict |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` | 0 errors (`tsc --noEmit`, includes `e2e/` and `playwright.config.ts`) |
| `npm test` | **78 passed** across 14 files |
| `npm run build` | `✓ Compiled successfully`, 57/57 pages generated, 1 pre-existing warning |
| `npm run seo:audit` | `PASS / no issues` — `0 ERROR, 0 WARN` (verified able to fail, see SEO) |
| `npm run db:migrate` · `db:seed` · `db:migrate-json` · `db:bootstrap-admin` | all run; **all five crashed before this pass** |
| `npm audit --omit=dev` | `found 0 vulnerabilities` |
| `npm audit` (incl. dev) | 4 moderate, all `esbuild` via `drizzle-kit` (a build tool, not shipped). Fix requires downgrading `drizzle-kit` to 0.18.1 — not applied |
| `npm run test:e2e` | **not run** — see Testing |

Runtime checks against a real `node server.mjs` on port 4599:
`/`, `/courses`, `/shop`, `/classes`, `/verify/AZ-C-1182`, `/api/health`,
`/robots.txt`, `/sitemap.xml` all returned **200**.

---

## Architecture — READY

Single Next.js 16 App Router modular monolith on Node 22. No microservices,
queues, CQRS or event sourcing were introduced. `lib/db/commerce.ts` and
`lib/checkout-lines.ts` are the only new modules; both exist because a specific
production defect required them.

Evidence: production build compiles; 57 routes generate; server boots and serves.

## Database — PARTIAL

PostgreSQL via Drizzle, 24+ tables, `drizzle/0000_init.sql` +
`drizzle/0001_commerce_atomicity.sql`, tracked in `schema_migrations`.
Constraints: unique phone/email/slugs/certificate codes, unique
`(user_id, course_slug)` enrolments, unique `gateway_transaction_id`,
`CHECK (price|stock|remaining >= 0)`, `status_code IN (301,308)`, composite
indexes on `(user_id,status)`, `(entity_type,entity_id)`, `(user_id,code)`.
Money is `INTEGER` Toman; no floats.

**Gap:** every migration and integration test ran against **PGlite**, not a real
PostgreSQL server — none was available in this environment. The SQL is
PostgreSQL-dialect, but it has never been executed by PostgreSQL.

**Gap:** `lib/store.ts` still persists whole collections with
`DELETE … WHERE pk NOT IN (…)`. Correct for one Node process (the cPanel
deployment); two processes can delete each other's rows. The commerce
reservation columns are deliberately excluded from that upsert and are safe.

## Authentication — PARTIAL

scrypt with a 16-byte random salt and `crypto.timingSafeEqual`
(`lib/auth.ts`, covered by `lib/__tests__/auth.test.ts`). Sessions live in
PostgreSQL; the raw token is the primary key.

**Fixed this pass:** session validity was never enforced — `getSessionUser()`
accepted any existing row and `sessions.expires_at` was always `NULL`. Now
`sessionState()` rejects unknown, revoked and expired sessions on every
protected request; `createSession()` writes a 30-day expiry; legacy sessions
derive expiry from `lastSeen`; a session with no timestamp at all is rejected.
7 tests in `lib/__tests__/session-state.test.ts`.

**Gap:** **no password reset flow exists.** `password_resets` is a table with no
action or route behind it. Recovery today is an admin manually resetting a
password from `/admin/users`.

## Authorization — PARTIAL

Role model `super_admin | admin | manager | editor | support | instructor | student`
with a server-side `can(user, permission)` matrix, enforced in
`app/admin/layout.tsx` and in each action.

Verified live: an anonymous `GET /admin` renders the login gate
(`این بخش مخصوص همکاران است`) with no admin data and no sidebar; `/admin/users`,
`/admin/orders`, `/admin/audit`, `/admin/payments` behave identically.

**Gap:** no automated IDOR regression tests (instructor editing another
instructor's course, a user reading another user's order or address). The
ownership rules exist in code but nothing fails if they regress.

## Payments — PARTIAL

Server-side pricing, server-to-server Zarinpal verification, explicit state
machines for orders and payments, and database-level idempotency.

Verified by `lib/__tests__/commerce.integration.test.ts`:
- `markPaymentPaid` returns `true` once, `false` on every replay
- a second payment reusing a `gateway_transaction_id` is rejected by the UNIQUE index
- `markOrderPaid` flips once
- `insertEnrollmentIfAbsent` creates exactly one enrolment
- `writeOrderItems` is idempotent

`?Status=OK` is never trusted — it only decides whether to call the gateway.
Demo mode cannot be active in production (`demoPaymentAllowed()`).

**BLOCKED BY CREDENTIAL:** no Zarinpal merchant id. The integration is complete
but has never contacted a live gateway.
**Gap:** no refund call and no admin refund action; no reconciliation job for
orders whose buyer never returned from the gateway (they stay
`AWAITING_PAYMENT` holding stock).

## Inventory — READY

Stock and seats are **reserved**, not consumed, at order creation and settled on
verified payment. Each hold is a conditional `UPDATE … WHERE` inside a
transaction, so the database decides the winner:

```sql
UPDATE products SET reserved_stock = reserved_stock + $2
 WHERE slug = $1 AND active
   AND (kind <> 'physical' OR allow_backorder OR (stock - reserved_stock) >= $2)
```

Tests: a 3rd unit on stock=2 is refused; 10 concurrent reservations on stock=3
yield exactly 3 wins; 12 concurrent seat requests on `remaining=4` yield exactly
4; a multi-line order whose product line fails rolls the class seat back to
`reserved_seats = 0`.

That last test found a real bug — returning a failure from inside
`sql.transaction()` **commits** the partial hold. It now throws.

**Caveat:** PGlite is single-connection, so these prove the guards are correct,
not that PostgreSQL behaves identically under genuine contention. Re-run against
PostgreSQL before relying on horizontal scale.

## Storage — PARTIAL

`lib/storage/` implements S3 SigV4 `PUT`/`GET` with a `data/object-store` +
`/api/media` fallback. `/api/health` reported
`"storage":"local","storageConfigured":false` — i.e. **no bucket is configured**,
so uploads currently land on local disk.

**BLOCKED BY CREDENTIAL:** S3 endpoint/bucket/keys.
**Gap:** upload validation checks size and extension for lesson files; magic-byte
signature checking is not implemented.

## Video — PARTIAL

Free trailer → web player; paid lesson → SpotPlayer where configured. Tokens are
HMAC-signed with an expiry, files live outside `/public`, and path traversal is
guarded.

Documented honestly as **access control, not DRM**: signed URLs and a moving
watermark do not prevent capture.

**BLOCKED BY CREDENTIAL:** SpotPlayer API key.

## Certificates — READY

Snapshot fields (`student`, `course`, `instructorName`, `hours`, `issuedAt`) are
copied at issue time, so renaming a course cannot alter an issued certificate.
Codes are non-sequential. `/verify/[code]` exposes only validity, name, course,
hours and date.

**Fixed this pass:** verification had no throttling. It now applies
`LIMITS.certVerify` (30/15 min) per IP. Verified live — three lookups returned
`این گواهی معتبر است`, subsequent ones returned
`تعداد استعلام‌ها بیش از حد مجاز است`.

## SEO — READY

`/admin/seo` (defaults, organisation, socials, local business), per-entity
`seo_entries`, centralised fallback in `lib/seo/`, `generateMetadata()` on public
pages, canonical URLs, JSON-LD (Organization, WebSite, Course, Product/Offer,
Article, Person, BreadcrumbList), `/admin/seo/redirects` with 301/308 only and
loop detection, slug changes create redirects.

`npm run seo:audit` reports `0 ERROR, 0 WARN` over 6 courses, 4 classes,
4 articles, 5 products, 5 paths, 3 instructors — counts confirmed by direct
query, so this is a real pass and not an empty read. The tool was also proved
able to fail: blanking one course's `excerpt` and `image` on a scratch database
produced `WARN /courses/carpet-weaving-foundations Missing description` and
`Missing OG image`.

Live `robots.txt` disallows `/admin /dashboard /instructor /account /auth /api
/cart /checkout`.

## Security — PARTIAL

Verified live on a running server:
- CSP with `frame-ancestors`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`; plus `nosniff`, `Referrer-Policy`, `Permissions-Policy`; HSTS in production
- Server Action origin check active — a POST with `Origin: http://evil.example` produced `x-forwarded-host … does not match origin … Aborting the action.` → `Invalid Server Actions request`
- `NODE_ENV=production` without `DATABASE_URL`/`NEXT_PUBLIC_APP_URL` → `Production refused to start`
- Pino structured logs with an event field; no password/token/secret logging
- `npm audit --omit=dev` → 0 vulnerabilities

**Gaps:** the rate limiter is in-process (wrong behind a load balancer);
`lib/monitoring.ts` reports Sentry "configured" purely from `SENTRY_DSN` and
never transmits an error — the SDK is not a dependency; no dedicated CSRF token
beyond Next's origin check.

## Testing — PARTIAL

`npm test` → **78 passed / 14 files**, including:

| File | Covers |
|---|---|
| `commerce.integration.test.ts` (18) | oversell, capacity, transaction rollback, payment/enrolment idempotency — real SQL on in-memory PGlite |
| `checkout-lines.test.ts` (9) | tampered price/title/qty rejected; server prices authoritative |
| `session-state.test.ts` (7) | expired, revoked, unknown, legacy and timestamp-less sessions |
| `stock.test.ts` (7) | available stock/seats arithmetic |
| plus the 37 pre-existing tests | pricing, order states, auth hashing, rate limit, SEO fallbacks, redirects, money, navigation |

**BLOCKED:** `e2e/` contains a complete Playwright suite (student journey, store
journey, admin journey, security regressions including the price-tampering test)
plus `playwright.config.ts` and a global setup that builds a disposable
`data/pglite-e2e` database. It typechecks. It has **never been executed**:
`npx playwright install` fails in this sandbox with
`Client network socket disconnected before secure TLS connection was established`
against `cdn.playwright.dev`, and no system Chromium is present.
Run `npm run test:e2e:install && npm run test:e2e` on a machine with browser
access before treating it as passing.

## CI/CD — PARTIAL

The workflow lives at **`ci/ci.yml`** and must be copied to
`.github/workflows/ci.yml`:

```bash
cp ci/ci.yml .github/workflows/ci.yml
```

It could not be committed at its final path from this session — the GitHub App
token lacks the `workflows` scope
(`refusing to allow a GitHub App to create or update workflow
.github/workflows/ci.yml without workflows permission`), so the push was
rejected until the file was moved. Until it is copied into place, **CI does not
run**.

It runs `npm ci → lint → typecheck → test → seo:audit → build →
npm audit --omit=dev` on Node 22, then a separate `e2e` job that installs
Chromium and runs Playwright, uploading traces on failure.

**Not verified:** no workflow run was triggered from this environment. The
`npm ci` step that previously would have failed on the first line now succeeds
locally.

## Monitoring — PARTIAL

Pino JSON logs with `event`, `level`, `time`, `service`. `/api/health` verified
live: `{"status":"ok","db":"pglite","storage":"local","storageConfigured":false,
"monitoring":{"sentry":"not configured","logging":"pino"},"demoPayment":true}`
— 200 when healthy, 503 when the database is down, and it leaks no credentials.

**Gap:** Sentry is decorative. `lib/monitoring.ts` only reports whether
`SENTRY_DSN` is set and issues a `HEAD` request; no exception is ever sent and
`@sentry/nextjs` is not installed.

## Backup — PARTIAL

`docs/BACKUP.md` documents `pg_dump` scheduling, off-server copies, retention
(7 daily / 4 weekly / 6 monthly), encryption and a restore procedure.

**Gap:** no restore was performed here — there is no PostgreSQL instance to
restore into. The restore procedure is written but untested.

## Deployment — PARTIAL

`docs/DEPLOY.md` covers cPanel/Node: `npm ci → npm run db:migrate →
npm run build → restart → GET /api/health`. Node ≥22, `server.mjs` startup file,
`PORT` injected by the platform.

Verified: the built app refuses to start in production without
`DATABASE_URL`, `APP_SECRET` (≥32) and `NEXT_PUBLIC_APP_URL`.

**Gap:** staging is documented but no staging environment exists.

---

## Remaining risks (ordered)

1. **No password reset.** A user who forgets their password has no self-service
   path. `password_resets` exists as an unused table.
2. **Socket.IO tickets bypass PostgreSQL.** `server.mjs` still reads/writes
   `data/db.json` and the WAL for support chat. Messages written there are not
   read back by the Next store, so live chat can silently diverge from the
   ticket list. Not fixed this pass — a rewrite without a way to exercise it
   would be a worse outcome than a documented gap.
3. **E2E suite unexecuted.** Checkout, login and admin flows have no automated
   browser coverage that has actually run.
4. **PGlite is the only database exercised.** No migration, query or
   concurrency guard has been run by PostgreSQL itself.
5. **Single-process assumption.** Collection-replace writes and the in-process
   rate limiter are both correct for exactly one Node process.
6. **Sentry is inert.** A production outage would be invisible except in Pino logs.
7. **No reconciliation** for orders abandoned at the gateway — they hold
   reservations indefinitely.

## External credentials still required

| Integration | Status |
|---|---|
| PostgreSQL | Implemented, required in production — **no server available here to test against** |
| Zarinpal merchant id | **BLOCKED BY CREDENTIAL** |
| S3-compatible object storage | **BLOCKED BY CREDENTIAL** — local fallback active |
| SpotPlayer API key | **BLOCKED BY CREDENTIAL** |
| SMS provider (Kavenegar/Ghasedak) | **BLOCKED BY CREDENTIAL** — demo mode must not issue real OTPs |
| SMTP | **BLOCKED BY CREDENTIAL** — demo mode logs instead of sending |
| Sentry DSN | **BLOCKED BY CREDENTIAL**, and the SDK is not installed |

## Bottom line

Safe to deploy to a staging environment with a real PostgreSQL instance, real
object storage and test gateway credentials, in order to exercise what could not
be exercised here. **Not** safe to take real money until: PostgreSQL has actually
run the migrations and the commerce queries, the Playwright suite has passed
once, password reset exists, and the Socket.IO ticket path is on the same
database as everything else.
