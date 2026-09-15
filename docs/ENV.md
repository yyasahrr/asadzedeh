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

- **Zibal (launch gateway)** `ZIBAL_MERCHANT` — see `docs/PAYMENT.md`.
- **MeliPayamak (launch SMS panel)** `MELIPAYAMAK_USERNAME` + `MELIPAYAMAK_PASSWORD` — see `docs/SMS.md`.
- **Other gateways** `PAYMENT_PROVIDER`, `PAYMENT_MERCHANT_ID`, `PAYMENT_SECRET`, `PAYMENT_SANDBOX`, `ZARINPAL_MERCHANT_ID`.
- **S3** `S3_*` — Liara / Arvan / MinIO / AWS. Without them, uploads go to `data/object-store` and `/api/media/...`.
- **Sentry** `SENTRY_DSN` — no-op unless set.
- **SpotPlayer / ffmpeg / Neshan** — same as before.

## Environment vs. the admin panel

Payment and SMS credentials can be set in two places. **The environment wins
whenever it has a value**; the stored settings are used only for what the
environment leaves empty. That is deliberate: a merchant string or a panel
password belongs in the host's environment block, not in a database row that
every editor-level account can read back.

| Purpose | Environment | Admin panel |
|---|---|---|
| Payment gateway | `PAYMENT_PROVIDER` | تنظیمات → درگاه پرداخت |
| Zibal merchant | `ZIBAL_MERCHANT` | تنظیمات → درگاه پرداخت |
| SMS panel | `SMS_PROVIDER` | تنظیمات → سامانه پیامکی |
| MeliPayamak login | `MELIPAYAMAK_USERNAME` / `MELIPAYAMAK_PASSWORD` | تنظیمات → سامانه پیامکی |

The settings page says so when it is being overridden, and `/api/health` reports
`integrations.*.fromEnvironment` for the same reason.

**`PAYMENT_SANDBOX` is the one switch that behaves differently in production.**
The stored default is `sandbox: true` (safe on a laptop), so in production the
sandbox is enabled *only* by `PAYMENT_SANDBOX=true`. A live site must never
quietly take test transactions.

A blank value (`KEY=`) is treated as unset everywhere, not as an invalid one —
an empty text box in a hosting panel must not stop the process from booting.

## Demo flags

`ALLOW_DEMO_PAYMENT` and `ALLOW_DEMO_SEED` default off in production. Do not enable them on a live academy.

## Verifying what the process actually picked up

```bash
curl -s $NEXT_PUBLIC_APP_URL/api/health | jq .integrations
```

```json
{
  "sms":     { "configured": true,  "provider": "melipayamak", "fromEnvironment": true },
  "payment": { "configured": true,  "provider": "zibal", "sandbox": false, "fromEnvironment": true }
}
```

Booleans only — no credential is ever exposed on this endpoint.
