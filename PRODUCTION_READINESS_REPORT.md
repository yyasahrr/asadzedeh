# Production readiness report — اسدزاده

Date: 2026-09-07

This report does **not** declare the academy production-ready. The JSON store was replaced with a PostgreSQL-backed store and the commerce/auth/SEO surface was hardened, but several acceptance items still fail.

## What now passes

| Area | Evidence |
|---|---|
| Lint | `npm run lint` — 0 errors |
| Typecheck | `npm run typecheck` — 0 errors |
| Unit tests | `npm run test` — 37 passed |
| Build | `npm run build` — Next.js 16.3.4 compiled |
| Secrets | Production start requires `APP_SECRET` (≥32), `DATABASE_URL`, `NEXT_PUBLIC_APP_URL` |
| Auth | Public register is student-only. Admins via `npm run db:bootstrap-admin` / `/admin/users`. TOTP, rate limits on login/register/TOTP |
| Payments | Integer Toman, Rial only at Zarinpal, demo gateway blocked in production, payment rows + authority uniqueness, checkout lock |
| Certificates | Non-sequential codes; issued when required lessons complete |
| SEO | Admin UI `/admin/seo`, sitemap/robots, JSON-LD, 301/308 with loop detection, `npm run seo:audit` |
| Storage | S3 SigV4 PUT or `data/object-store` + `/api/media` |
| Health | `GET /api/health` |
| Headers | CSP, nosniff, HSTS (prod), noindex on private paths |
| Docs | `docs/DEPLOY.md`, `ENV.md`, `BACKUP.md`, `SECURITY.md`, `SEO.md` |

## Remaining blockers (do not go live until these are closed)

1. **Store persist is still full-collection replace** (`replaceTable` DELETE+upsert per write). Checkout maps entire products/classes arrays under an in-process lock. Two Node processes can still race inventory. Need row-level SQL (`UPDATE products SET stock = stock - $1 WHERE stock >= $1`).
2. **Socket.IO tickets** (`server.mjs`) still read/write the WAL/JSON snapshot, not Postgres. Live chat can diverge from the Next store.
3. **No Playwright / E2E / security test suite.** Vitest covers pricing, order states, auth hashing, rate limit, SEO helpers. Missing: login, checkout, payment callback, RBAC matrix in a browser.
4. **Zod is not on every Server Action.** Env is Zod-validated; most forms still use ad-hoc `str()`/`num()`.
5. **No dedicated CSRF tokens.** Relies on Next.js Server Action origin checks. Fine for same-origin forms; document if you add public JSON APIs.
6. **Rate limiter is in-process.** Multiple instances need a reverse-proxy or Redis limiter.
7. **Sentry is a no-op** unless `SENTRY_DSN` is set; the official SDK is not a dependency.
8. **Next.js 16** warns that `middleware.ts` should become `proxy`. Behaviour is still applied.
9. **PGlite is not a production database.** `DATABASE_URL` is required at runtime. CI/build may still log init failures if Postgres is absent (WAL/seed fallback).
10. **SpotPlayer / SMS / email** remain optional integrations; demo SMS must not be used for real OTPs.

## How to go live (after blockers)

See `docs/DEPLOY.md`. Minimum: Postgres, `APP_SECRET`, `NEXT_PUBLIC_APP_URL`, Zarinpal merchant, S3 bucket, `npm run db:migrate`, bootstrap admin, TLS, backups.

## Honest status

**Not production-ready.** The academy can be developed and demoed locally (PGlite + demo payment). A live school with real money, videos, and students still needs row-level commerce, multi-instance locking, E2E tests, and real monitoring.
