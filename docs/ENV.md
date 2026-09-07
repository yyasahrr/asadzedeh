# Environment

Copy `.env.example` to `.env.local`. Next.js loads `.env.local` automatically; `server.mjs` inherits the process environment.

## Required in production

| Variable | Why |
|---|---|
| `APP_SECRET` | Cookie/HMAC signing, TOTP encryption. Min 32 chars. |
| `DATABASE_URL` | PostgreSQL. PGlite is development-only. |
| `NEXT_PUBLIC_APP_URL` | Canonical URLs, sitemap, payment callbacks. |

The process refuses to start (`instrumentation.ts` → `assertProductionSecrets`) if these are missing when `NODE_ENV=production`.

## Optional integrations

- **Zarinpal** `ZARINPAL_MERCHANT_ID` — amounts are stored as integer Toman and converted to Rial only at the gateway.
- **S3** `S3_*` — Liara / Arvan / MinIO / AWS. Without them, uploads go to `data/object-store` and `/api/media/...`.
- **Sentry** `SENTRY_DSN` — no-op unless set.
- **SpotPlayer / ffmpeg / Neshan** — same as before.

## Demo flags

`ALLOW_DEMO_PAYMENT` and `ALLOW_DEMO_SEED` default off in production. Do not enable them on a live academy.
