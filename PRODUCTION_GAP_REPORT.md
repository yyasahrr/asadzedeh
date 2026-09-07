# Production Gap Report — اسدزاده | Asadzedeh

**Date:** 2026-09-07  
**Scope:** Audit of the existing Next.js App Router codebase before production hardening.  
**Method:** Inspect → Understand. No rewrite of healthy UI/domain code.

---

## Current architecture (as found)

```
Browser (RTL, Persian)
  → server.mjs (Next.js + Socket.IO)
    → App Router pages / Server Actions / Route Handlers
      → lib/store.ts  ← PRIMARY DATA LAYER
        → data/db.json  (file, gitignored)
      → data/videos/          (private video vault on local FS)
      → data/lesson-files/    (lesson attachments on local FS)
      → public/uploads/       (images on local FS)
      → Zarinpal / SpotPlayer / SMS / SMTP  (optional; demo fallback)
```

Stack: Next.js 16 App Router, React 19, Tailwind v4, TypeScript, custom `server.mjs`.  
No PostgreSQL, no ORM, no Zod, no structured logger, no Sentry, no object storage, no health endpoint.

---

## What is already solid (preserve)

| Area | Status |
|---|---|
| RTL visual identity, design tokens, Vazirmatn/Peyda self-hosted fonts | Keep |
| Server Components by default; Client only where interactive | Keep |
| scrypt password hashing, HttpOnly session cookie, TOTP + hashed recovery codes | Keep, harden |
| Role permissions (`can()`), admin MFA gate, instructor panel isolation | Keep, extend |
| Checkout re-prices on the server (client price ignored) | Keep |
| Payment callback authority binding + paid-order idempotency | Keep, add payments table |
| Video vault outside `/public`, HMAC signed tokens, path-traversal guards | Keep |
| Audit log with hash chain + secret redaction | Keep, move to Postgres |
| Sitemap / robots / basic `generateMetadata` / Course JSON-LD | Keep, complete |
| CI workflow (lint, tsc, vitest, build) | Keep, extend |
| cPanel-oriented `server.mjs` (PORT/HOSTNAME from env) | Keep, graceful shutdown |

---

## CRITICAL

| ID | Issue | Risk |
|---|---|---|
| C1 | **`data/db.json` is the primary database.** Entire collections are read-modify-written. Concurrent checkouts, stock updates, and session writes can lose rows. No constraints, no transactions, no backup story. | Data loss, oversell, duplicate enrollments |
| C2 | **Inventory is not atomic.** Checkout decrements stock in a full-array replace. Two simultaneous checkouts of the last unit both succeed. | Overselling |
| C3 | **Demo payment is the default**, including if `NODE_ENV=production` and merchant id is empty. Orders are marked paid instantly. | Fake revenue / unpaid access in production |
| C4 | **No environment validation at startup.** Missing `APP_SECRET` / `DATABASE_URL` in production does not fail fast (except video signing). | Weak secrets, silent misconfig |
| C5 | **Uploads and videos live on the app filesystem.** cPanel disk fills; no signed object storage; no quota beyond per-file limits. | Outage, data loss, insecure paths if misconfigured |
| C6 | **Certificate codes are sequential** (`AZ-C-{max+1}`). Enumerable. | Certificate enumeration |
| C7 | **No `/api/health`.** Process can be up while the data layer is corrupt/unwritable. | Blind deploys |
| C8 | **Production seed users** are skipped, but there is **no Super Admin bootstrap**. First admin cannot be created without editing JSON. | Locked-out production |

---

## HIGH

| ID | Issue | Risk |
|---|---|---|
| H1 | No CSRF origin check on Server Actions beyond SameSite=Lax. Fine for cookie sessions, but payment callback is GET and state-changing. | Replay / confused-deputy |
| H2 | Rate limiting only exists on Socket.IO chat. Login, register, 2FA, cert verify, payment, uploads are unlimited. | Brute force, SMS/cost abuse |
| H3 | No CSP / HSTS. `next.config.ts` has nosniff, referrer, permissions, XFO only. | XSS impact, mixed content |
| H4 | Password reset does not exist. Guest checkout SMS-provisions a password. | Account recovery gap; SMS secret in transit |
| H5 | `writeDb` is not transactional across order + stock + enrollment. | Partial fulfilment |
| H6 | Payment attempts are fields on `Order`, not a first-class `payments` table. Gateway transaction id is not UNIQUE. | Duplicate fulfilment on retry |
| H7 | Object storage missing; video/lesson/assignment files not portable. | Cannot scale off cPanel disk |
| H8 | SEO: sitemap includes `/auth` and `/cart`; robots misses `/instructor`, `/account`, `/auth`. No per-entity SEO, no redirect manager, no admin SEO, no audit job. | Duplicate/index private URLs, lost slug SEO |
| H9 | Structured logging is `console.log`. No Pino, no Sentry. | Unobservable production |
| H10 | Admin `actions.ts` is 1.6k lines — hard to review authorization on every action. | Privilege bugs slip through |
| H11 | Ownership: instructors are isolated in their panel, but some admin actions are role-only (no resource owner check on every mutation). | IDOR if a new action is added carelessly |
| H12 | `resetDemoData` exists for `admin` role — catastrophic in production if reachable. | Wipe |
| H13 | Session tokens stored in plaintext in JSON (acceptable if DB is private) with no rotation on privilege change besides password change. | Stolen cookie reuse |
| H14 | No pagination on users/orders/audit — full collection loaded every request. | Memory / TTFB |

---

## MEDIUM

| ID | Issue |
|---|---|
| M1 | Zod is not a dependency; validation is ad-hoc string helpers. |
| M2 | Dates mixed: some ISO (`createdAt` on sessions), some Jalali display strings stored as source of truth (`faToday()` on orders). |
| M3 | Monetary values are integers (good) but currency is implicit; no single documented contract. |
| M4 | Cart is localStorage only — lost across devices; server cannot reserve stock until checkout. |
| M5 | Coupon `ASAD10` is hardcoded; no coupons table. |
| M6 | Order statuses are free-form Persian strings; no explicit state machine. |
| M7 | Certificate snapshot is name/course/hours/date — no instructor snapshot, no userId. |
| M8 | Progress is an array of lesson ids on enrollment; completable from the client with enrollment only (no watch-time proof). Acceptable if lessons are the rule, but forgeable. |
| M9 | Instagram embed is not lazy beyond component; no CSP allowlist yet. |
| M10 | `generateStaticParams` on blog/classes may bake unpublished content. Pages are `force-dynamic` for courses. |
| M11 | No `error.tsx` / `global-error.tsx`. |
| M12 | No `typecheck` / `seo:audit` / `db:migrate` / `db:seed` scripts. |
| M13 | CI does not run against Postgres; no integration tests for payments/inventory. |
| M14 | `server.mjs` has no SIGTERM graceful shutdown. |
| M15 | Recovery codes hashed (good); TOTP secret falls back to `plain:` if `APP_SECRET` missing. |
| M16 | Public registration cannot create admin (good). Staff creation is admin-only (good). |

---

## LOW

| ID | Issue |
|---|---|
| L1 | Few unit tests (auth hash, pricing copy-pasted, safeNextPath). |
| L2 | No Playwright e2e. |
| L3 | Dashboard mock leftovers in `lib/data.ts` (`dashboardStudent`, `adminOverview`) unused by live panels but still in seed content. |
| L4 | Next/Image not used everywhere (static `/images/...` via `<img>` likely). |
| L5 | Search Console / analytics not wired (optional by design). |

---

## Phase plan (this workstream)

1. **Database** — PostgreSQL + Drizzle, schema, seed, JSON migrator, store adapter keeping domain types.  
2. **AuthZ** — super_admin bootstrap, session revoke, password reset, production payment guard, disable demo reset.  
3. **Validation & security** — Zod, rate limit, headers, env fail-fast, upload hardening.  
4. **Commerce** — payments table, inventory reservation, order state machine, idempotent verify.  
5. **Courses** — progress rows, non-guessable certificates, eligibility rule.  
6. **Storage** — S3-compatible adapter with local fallback (explicitly “not configured”).  
7. **SEO** — admin, fallbacks, sitemap/robots, JSON-LD, redirects, audit CLI.  
8. **Observability** — Pino, optional Sentry, health, audit in Postgres.  
9. **Tests + CI** — unit/integration/security, typecheck, postgres service.  
10. **Docs** — README, production, deploy, backup, security, SEO, payment, storage.

**Non-goals:** microservices, Kafka, Kubernetes, rewriting the visual design, inventing DRM claims.

**External credentials (will remain “not configured” until the operator sets them):**

| Integration | Status after this work |
|---|---|
| PostgreSQL | Implemented — required in production |
| Zarinpal | Implemented — blocked by merchant id |
| SpotPlayer | Implemented — blocked by API key |
| Kavenegar / Ghasedak | Implemented — blocked by API key |
| SMTP | Implemented — blocked by host |
| S3 / Liara / Arvan object storage | Implemented — local fallback if unset |
| Sentry | Implemented — no-op without DSN |
| Neshan maps | Already optional |

---

## Decision log

- **ORM:** Drizzle (as specified). Prisma not present; no reason to introduce it.  
- **Store API:** Keep `lib/store.ts` getters so 200+ call sites do not get a rewrite. Back the cache with Postgres + write-ahead snapshot. Critical commerce paths get dedicated SQL (insert/update with row conditions).  
- **Roles:** Preserve existing `admin | manager | editor | support | instructor | student`. Add `super_admin`. Map `admin` ≈ super admin for V1; restrict bootstrap and destructive ops to `admin`/`super_admin`.  
- **Money:** Integer **Toman**. `currency = TOMAN`. Zarinpal still multiplies by 10 for Rial at the gateway boundary only.  
- **Time:** New columns `timestamptz` UTC. Jalali only in UI via `fa-IR`.  
- **Redis:** Not added. In-process rate limiter for V1.

---

# Pass 2 — 2026-09-07 (verification-driven audit)

The audit above produced the PostgreSQL/Drizzle migration and the hardened
commerce surface. This pass re-audited that work by **running** it. Every
finding below was confirmed by a command, not by reading code.

## Confirmed broken before this pass

| ID | Sev | File | Reason | Impact | Fix applied |
|---|---|---|---|---|---|
| P1 | CRITICAL | `package.json` | `npm ci` failed: `vitest@5` requires `@types/node ^22 \|\| >=24`, root pinned `^20`. CI's very first step could not run. | CI never executed; "CI passes" was unverifiable | `@types/node` → `^22`, `engines.node` → `>=22.0.0`, CI Node 22. `npm ci` now succeeds |
| P2 | HIGH | all 5 `scripts/*.ts` | Top-level `await` under tsx with CJS output → `Top-level await is currently not supported with the "cjs" output format` | `seo:audit`, `db:migrate`, `db:seed`, `db:migrate-json`, `db:bootstrap-admin` all crashed | `"type": "module"` in `package.json`. All five verified running |
| P3 | CRITICAL | `app/api/payment/callback/route.ts`, `lib/order-payment.ts` | Reservation was released/settled by rewriting in-memory arrays; `orders.releasedAt` was the only guard, and stock was decremented at order creation, not at payment | Oversell across processes; capacity consumed by unpaid orders | New `lib/db/commerce.ts`: conditional `UPDATE … WHERE` + `orders.settled_at`/`released_at` |
| P4 | CRITICAL | `lib/db/commerce.ts` (new) | **Found by test**: returning a failure object from inside `sql.transaction()` **commits** the partial hold | A rejected order left a seat permanently reserved | Rejections now `throw` inside the transaction; `commerce.integration.test.ts` asserts `reserved_seats = 0` afterwards |
| P5 | CRITICAL | `lib/auth.ts` | `getSessionUser()` accepted any existing session row. No `expiresAt`, no `revokedAt`, no check at all. The `sessions.expires_at` column was always written as `NULL` | Stolen cookies valid forever; revocation not enforced | `sessionState()` / `isSessionActive()`; `Session.expiresAt`/`revokedAt`; `createSession` sets expiry; `persist` stores it. 7 tests |
| P6 | HIGH | `app/verify/[code]/page.tsx` | No rate limiting — public certificate codes enumerable without bound | PII enumeration | Per-IP `LIMITS.certVerify` throttle + `force-dynamic`. Verified live: 3 lookups OK, then throttled |
| P7 | HIGH | `lib/db/client.ts` | Module-level executor singleton; Next.js bundles the module into several server chunks, so several copies each opened their own connection | For PGlite the second instance dies ("Connection closed") | Handle moved to `globalThis` (true per-process singleton) |
| P8 | MEDIUM | `app/checkout/actions.ts` | `buildLines` lived inside a `"use server"` file → untestable | Price-tampering regression had no test | Extracted to `lib/checkout-lines.ts`; 9 tests |
| P9 | MEDIUM | `components/shop/ProductBuyBox.tsx`, `app/shop/[slug]/page.tsx`, `app/classes/[slug]/page.tsx` | UI showed `stock`/`remaining`, ignoring reservations | Sold-out items still shown as available | New `lib/stock.ts` (`availableStock`/`availableSeats`), used on all three surfaces. 7 tests |
| P10 | LOW | `.gitignore` | `data/pglite/`, WAL, `data/seo-redirects.json`, Playwright output not ignored | Local databases commitable | Added |

## Verified working, previously only asserted

| Claim | How it was verified this pass |
|---|---|
| Server Actions reject foreign origins | POST with `Origin: http://evil.example` → `x-forwarded-host … does not match origin … Aborting the action.` → `Invalid Server Actions request` |
| Production fails fast without `DATABASE_URL` | Built output booted with `NODE_ENV=production` → `Production refused to start. Missing required environment: DATABASE_URL, NEXT_PUBLIC_APP_URL` |
| `/admin` is not readable anonymously | Live request returns the login gate (`این بخش مخصوص همکاران است`), no admin rows, no sidebar |
| Security headers | Live response carries CSP (with `frame-ancestors`, `object-src 'none'`), `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| `seo:audit` is not a rubber stamp | Scratch DB: clean → `0 ERROR, 0 WARN`; one course's `excerpt`/`image` blanked → `WARN /courses/carpet-weaving-foundations Missing description` + `Missing OG image` |
| Migrations apply cleanly | `0000_init.sql` + `0001_commerce_atomicity.sql` applied on three separate fresh databases |
| No production vulnerabilities | `npm audit --omit=dev` → `found 0 vulnerabilities` |

## Still open after this pass

| ID | Sev | File | Status |
|---|---|---|---|
| O1 | HIGH | `lib/store.ts` | `replaceTable` still does `DELETE … WHERE pk NOT IN (…)` per collection. Correct for one Node process; two processes can delete each other's rows. Commerce columns are exempt. |
| O2 | HIGH | `server.mjs` | Socket.IO ticket handlers still read/write `data/db.json`/WAL, not PostgreSQL. Chat messages written there are not read back by the Next store. Not fixed this pass — deliberately, rather than ship an untested rewrite. |
| O3 | HIGH | `app/auth/actions.ts` | **No password reset flow exists.** `password_resets` is an empty table with no action or route behind it. Gap H4 from pass 1 is still open. |
| O4 | HIGH | `e2e/` | Playwright suite written and typechecked, **never executed**: `npx playwright install` cannot reach `cdn.playwright.dev` from this sandbox (`Client network socket disconnected`). |
| O5 | MEDIUM | `lib/monitoring.ts` | `monitoringStatus()` reports Sentry "configured" from `SENTRY_DSN` and sends a `HEAD` to sentry.io. It never transmits an error. The SDK is not a dependency. |
| O6 | MEDIUM | `lib/rate-limit.ts` | In-process limiter. Correct for one Node process; wrong behind a load balancer. |
| O7 | MEDIUM | `app/admin/actions.ts` | Still 1.6k lines; Phase 20's split into `app/admin/actions/*.ts` was not done. |
| O8 | MEDIUM | — | No IDOR/ownership regression tests (instructor editing another instructor's course, user reading another user's order/address). |
| O9 | LOW | `lib/store.ts:687` | Turbopack warning: dynamic `fs.readFileSync(WAL_PATH)` traces the whole project into the server output. Pre-existing (same expression at `HEAD`), not fixed. |
