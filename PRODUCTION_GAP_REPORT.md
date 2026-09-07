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
