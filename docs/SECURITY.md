# Security

- Passwords: scrypt. Sessions: httpOnly cookie `az_session`.
- Staff 2FA: TOTP (`/account/security`). Policy flag in `/admin/security`.
- RBAC: `lib/auth.ts`. Public register always creates `student`. Admins are created by bootstrap or `/admin/users`.
- Rate limits: login/register/TOTP/checkout (`lib/rate-limit.ts`). In-process; put nginx limits in front of multiple instances.
- CSRF: Next.js Server Actions check the origin. Do not expose mutating GET handlers.
- Headers: CSP, nosniff, referrer, frame-ancestors, HSTS in production (`next.config.ts`).
- Payments: server-side prices, `withStoreLock` around checkout, payment rows keyed by authority, no demo gateway in production.
- Videos: signed short-lived URLs, watermark, SpotPlayer licenses after paid orders.
- `resetDemoData` is blocked in production.
