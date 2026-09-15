# Production Readiness Report — اسدزاده (Asadzedeh)

**Date:** 2026-09-15
**Commit under review:** working branch `arena/01a0a4f5-asadzedeh`
**Scope:** full stack — Next.js 16 App Router, PostgreSQL (Drizzle), payments, SMS, admin panel, deployment
**Launch integrations in scope:** Zibal (زیبال) payment gateway, MeliPayamak (ملی پیامک) SMS panel

---

## Verdict

# ⚠️ CONDITIONALLY READY

The application is production-ready in code, configuration and behaviour, and every
check that could be executed in this environment passed. Three things stand between
this and an unconditional **READY**, and none of them is a code defect:

1. **Live gateway credentials.** No real Zibal transaction and no real MeliPayamak
   message has been sent. The wire formats are pinned by tests; only the credentials
   and one live round trip are missing.
2. **Playwright E2E has never run.** `cdn.playwright.dev` is unreachable from this
   sandbox (TLS `ECONNRESET`; the Debian and npm mirrors are blocked too). The suite
   is written and typechecks; it must go green once in a browser, in CI.
3. **Backup restore has never been rehearsed.** No `pg_dump`/`pg_restore` binary
   exists in this sandbox, so `npm run backup:verify` could not be executed.

Everything else on the go-live path is done and verified — see the evidence table.

---

## What was executed

| Gate | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | **clean** |
| Lint | `npm run lint` | **0 errors** (1 pre-existing warning, `elementor-template-kit-v4/generator.mjs:106`) |
| Unit + integration | `npm test` | **327 passed / 327** across 34 files (was 279 before this pass) |
| Production build | `npm run build` | **compiled successfully**, 47 routes |
| SEO | `npm run seo:audit` | **0 ERROR, 0 WARN** |
| Dependency audit (prod tree) | `npm audit --omit=dev` | **0 vulnerabilities** |
| Dependency audit (full tree) | `npm audit` | 4 moderate, **dev-only** (`drizzle-kit`), risk accepted |
| Post-deploy smoke | `scripts/smoke.ts` vs. production server | **36/36 PASS** |
| HTTP security audit | `scripts/security-audit.ts` | **66/66 PASS** |
| Launch scenarios over HTTP | `scripts/scenario-test.ts` | **16/16 PASS** |
| Latency / throughput | `scripts/load-test.ts` (20 workers, 20 s) | **1226 req, 61 req/s, p50 329 ms, p95 462 ms, p99 539 ms, 0 errors** |
| Demo-account retirement | production boot against a real PostgreSQL | **4 accounts disabled, sessions revoked, audited** |
| Admin bootstrap | `npm run db:bootstrap-admin` | **super_admin created, demo admin disabled** |
| Real login over HTTP | Server Action POST | **303 → /admin, `az_session` set (Secure; HttpOnly; SameSite=lax)** |
| First-deploy rehearsal on an **empty** database | `db:migrate` → `db:bootstrap-admin` → `db:disable-demo` → `NODE_ENV=production npm start` | **migrations applied, super_admin created, demo accounts blocked, server boots, scenario suite 16/16** |
| Integration wiring from the environment alone | `integrationStatus()` with only the launch vars set | **`{sms:{configured:true,provider:"melipayamak"},payment:{configured:true,provider:"zibal",sandbox:false}}`, `commerceReady:true`, no credential in the payload** |

The last rows were run against a **real production-mode server**
(`NODE_ENV=production node server.mjs`) backed by a real PostgreSQL cluster, not a
mock — including a staged database copied from the development seed, which is the
exact situation a first deploy is in.

### Not executed, and why

| Gate | Status | Reason |
|---|---|---|
| Playwright E2E | **NOT EXECUTED** | `playwright install chromium` fails with `ECONNRESET` from `cdn.playwright.dev`; `apt-get update` and the npm binary mirror are both unreachable. CI job `e2e` in `.github/workflows/ci.yml` is the gate. |
| Backup restore rehearsal | **NOT EXECUTED** | no `pg_dump`/`pg_restore` in the sandbox. Run `npm run backup:verify -- --dump <file>` on the server. |
| Live payment / live SMS | **NOT EXECUTED** | no credentials. |

---

## Findings

### 1

```
Severity: CRITICAL
Issue:    Broken access control (IDOR) — any certificate could be read and
          downloaded without authentication.
Location: app/api/certificates/[code]/pdf/route.ts:6
          app/dashboard/certificates/[code]/page.tsx:14
Risk:     A certificate carries a student's name, course, instructor and issue
          date. Both endpoints answered an anonymous request with the full
          document. Legacy codes are sequential (AZ-C-1182, AZ-C-1204), so the
          whole register was walkable — no guesswork required.
How to reproduce:
          curl -i https://host/api/certificates/AZ-C-1182/pdf      # 200, application/pdf
          curl    https://host/dashboard/certificates/AZ-C-1182    # 200, student name in HTML
Recommended fix:
          Central ownership rule in lib/certificate-access.ts: owner, or staff.
          Everything else — missing code, somebody else's code, no session —
          answers 404, so the endpoint cannot confirm which codes exist. Public
          authenticity checks stay on /verify/[code], which is rate-limited.
Test required:
          lib/__tests__/certificate-access.test.ts (7 cases: anonymous, non-owner,
          owner, staff, namesake, legacy name-match, missing)
          + the anonymous checks in scripts/security-audit.ts and
            scripts/scenario-test.ts
Status:   FIXED / VERIFIED
          Verified on the production server: PDF 404 and page 404 anonymously,
          200 application/pdf for staff, and audit entries
          `certificate.access.denied` written for each refused attempt.
```

### 2

```
Severity: HIGH
Issue:    Demo profiles survived into production with published passwords.
Location: lib/auth.ts:12-96, lib/launch-check.ts:47, lib/seed.ts:116-146
Risk:     `u-editor`, `u-support`, `u-maryam`, `u-sara` — and `u-admin`, still on
          `admin123` — are seeded with hashes that live in this repository. Any
          database carried over from staging, or any deployment that ran
          `db:seed` once, shipped five working logins to a live academy, one of
          them an administrator.
How to reproduce:
          NODE_ENV=development npm run db:seed   # then deploy the same database
          # before: POST /auth with 09120000002 / editor123 signed you in
Recommended fix:
          Three layers, because one is not enough:
            - `demoAccountBlocked()` refuses a seed identity in production, and
              refuses the admin identity while it still answers to the seeded
              password. Rotating the password makes it a real account.
            - `retireDemoAccounts()` runs at boot in production: sets
              `disabled: true`, revokes every session the profile holds and
              writes a `user.disabled` audit entry. Idempotent.
            - `npm run db:disable-demo` writes the same state down explicitly and
              wipes the published hash, for operators who prefer a migration to a
              runtime rule.
          An explicitly `disabled` account is refused in *every* environment, so a
          disabled account cannot work locally and fail in production.
Test required:
          lib/__tests__/auth.test.ts (9 policy cases),
          lib/__tests__/launch-check.test.ts (7 cases),
          scripts/scenario-test.ts §2
Status:   FIXED / VERIFIED
          On the production boot: u-editor, u-support, u-maryam, u-sara all
          disabled with reason, sessions revoked, 4 audit rows. All five demo
          logins then answered `303 → /auth?error=invalid` with no session
          cookie, while the real super_admin signed in and reached /admin.
```

### 3

```
Severity: HIGH
Issue:    `npm run db:bootstrap-admin` refused to create an administrator, leaving
          a fresh deployment with nobody able to sign in.
Location: scripts/bootstrap-admin.ts:29-45
Risk:     The script counted the seeded `u-admin` as "an admin already exists" —
          even though that account is refused in production by finding 2. The
          documented remedy for a locked-out administration was therefore the one
          command that could not run. Go-live blocker.
How to reproduce:
          # database holding the seed, no NODE_ENV set
          SUPER_ADMIN_PHONE=09... SUPER_ADMIN_PASSWORD='...' npm run db:bootstrap-admin
          # → "An admin already exists. Promotion of a new phone is refused."
Recommended fix:
          Judge admins by `launchUsable()` — not disabled *and* not still on the
          seeded password — instead of by role alone. The predicate is
          deliberately environment-independent: a go-live tool must reach the same
          verdict in a shell that forgot NODE_ENV as it does on the server. On
          success the script also retires any leftover blocked admin.
Test required:
          Manual, against the rehearsal database (idempotency included)
Status:   FIXED / VERIFIED
          Re-run: super_admin created (u-super-mu2o1qc4), demo admin disabled;
          a second run says "already exists, no change"; a third phone is refused
          because a usable admin now exists.
```

### 4

```
Severity: HIGH
Issue:    A blank environment variable stopped the process from booting.
Location: lib/env.ts:10-24
Risk:     Hosting panels write `KEY=` for an unset variable. Every optional enum
          (ALLOW_DEMO_PAYMENT, DATABASE_SSL, S3_FORCE_PATH_STYLE, and the new
          PAYMENT_PROVIDER / PAYMENT_SANDBOX / SMS_PROVIDER) rejected "" as an
          invalid option, so one empty text box in cPanel turned a deploy into an
          outage — with the failure surfacing as a Zod error, not as "set this
          variable".
How to reproduce:
          PAYMENT_SANDBOX= node -e "import('./lib/env').then(m=>m.getEnv())"
          # → Invalid environment: PAYMENT_SANDBOX: Invalid option
Recommended fix:
          `blankToUndefined()` pre-processes every optional field: a string that
          is empty after trimming becomes absent. Applied to APP_SECRET and every
          optional enum.
Test required:
          lib/__tests__/integrations.test.ts (each case runs with the variables
          deleted rather than emptied, so a regression fails loudly)
Status:   FIXED / VERIFIED — `npm test` 327/327
```

### 5

```
Severity: MEDIUM
Issue:    The stored `sandbox: true` default could take a live shop to the PSP's
          test environment.
Location: lib/integrations.ts:52-73
Risk:     The admin panel stores `sandbox: true` as its default, which is right on
          a laptop. Carried into production it means real orders settle against a
          gateway sandbox: the site looks like it is taking money and is not.
How to reproduce:
          ZIBAL_MERCHANT=... npm start   # NODE_ENV=production
          # before: effectivePaymentSettings().sandbox === true
Recommended fix:
          In production the sandbox is honoured only from `PAYMENT_SANDBOX=true`.
          Outside production the stored setting still applies, so development is
          unaffected.
Test required:
          lib/__tests__/integrations.test.ts — "takes the Zibal merchant from the
          environment and leaves sandbox off", "honours an explicit sandbox switch"
Status:   FIXED / VERIFIED
```

### 6

```
Severity: MEDIUM
Issue:    An attacker-supplied `next` value was echoed into the login form.
Location: app/auth/page.tsx:20
Risk:     Not exploitable as shipped — React escapes the attribute and
          `safeNextPath()` rejects anything that is not a same-origin path before
          it is used as a redirect target. But attacker-controlled text reaching
          the HTML at all is one refactor away from being a problem, and the
          field was visible in View Source.
How to reproduce:
          curl 'https://host/auth?next=https://evil.example.com/"%20onmouseover="alert(1)'
          # before: <input type="hidden" name="next" value="https://evil.example.com/&quot; ..."
Recommended fix:
          Sanitise at the page boundary with the same `safeNextPath()` the action
          uses; an unusable value drops the field entirely.
Test required:
          scripts/security-audit.ts §6 (attribute breakout + absolute-URL checks)
Status:   FIXED / VERIFIED — the field is now absent from the response
```

### 7

```
Severity: MEDIUM
Issue:    The admin panel offered "reset demo data" in production.
Location: app/admin/settings/page.tsx:190
Risk:     The Server Action already refused in production, so this was not
          exploitable — but a panel that offers a destructive button which
          silently does nothing teaches operators not to trust the panel.
Recommended fix:
          Hide the danger zone when `isProduction()`, next to the guard that was
          already in the action.
Status:   FIXED / VERIFIED (typecheck + build)
```

### 8

```
Severity: LOW
Issue:    `/api/health` could not tell an operator whether the shop was able to
          take money.
Location: app/api/health/route.ts
Risk:     An unconfigured gateway is invisible until the first customer fails to
          pay. Uptime monitoring had nothing to alert on.
Recommended fix:
          Report `integrations.{sms,payment}` (configured / provider / sandbox /
          fromEnvironment) and `commerceReady`. Booleans and provider names only —
          `lib/__tests__/integrations.test.ts` asserts no credential can appear in
          the serialised status.
Status:   FIXED / VERIFIED
```

### 9

```
Severity: LOW
Issue:    Dead debug script committed at the repository root.
Location: tmp-check-db.mjs
Risk:     It iterated a list of plausible local connection strings and printed
          which ones worked. Harmless, but it is exactly the shape of a credential
          prober and has no place in a shipped tree.
Status:   FIXED — removed (git rm)
```

### 10

```
Severity: MEDIUM
Issue:    The MeliPayamak response parser recognised only the legacy success
          shape.
Location: lib/sms.ts (meliPayamakOk)
Risk:     The panel answers either { RetStatus, StrRetStatus, Value } or the
          newer REST shape { IsSuccessful, Message, Value }. Reading only the
          first meant a panel-side response change would report every successful
          send as a failure — the operator sees "the SMS is not sending", the
          user has in fact received the code, and any retry logic doubles the
          cost. The failure direction was safe (it never claims a false "sent"),
          which is why no unit test caught it: the fixture used the legacy shape.
Reproduce: stub the panel to return {"IsSuccessful":true,"Message":"success",
           "Value":"12345"} and call the driver's send() — before the fix it
           returned { ok: false }.
Fix:      accept either success indicator, and keep requiring a positive Value so
          a body that claims success without queuing anything is still a failure.
Test:     2 new cases in lib/__tests__/integrations.test.ts ("accepts the newer
          IsSuccessful response shape", "refuses a body that claims success but
          carries no reception id").
Status:   FIXED / VERIFIED — `npm test` 327/327
```

---

## Launch integrations

### Zibal (زیبال) — payment

Configured through the environment; the admin panel remains available and is
overridden when the environment has a value.

```bash
ZIBAL_MERCHANT=<merchant string>
PAYMENT_PROVIDER=zibal        # inferred from ZIBAL_MERCHANT if omitted
PAYMENT_SANDBOX=false
```

Verified by 7 driver cases plus dispatcher cases: request posts to
`gateway.zibal.ir/v1/request` with the amount in **Rial** (1,750,000 Toman →
17,500,000 Rial), `orderId`, `callbackUrl?order=<id>` and `mobile`; success is
`result === 100` + `trackId`; `verify` treats `201` as *already verified*; a
verified amount that does not match the order is rejected; a gateway outage
becomes a failed verification rather than a throw. `request` is never retried;
`verify` is retried (idempotent).

**Not done:** no live transaction. `GET /api/health` reports
`{"payment":{"configured":true,"provider":"zibal","sandbox":false}}` against
rehearsal credentials — the merchant string has never been accepted by Zibal.

### MeliPayamak (ملی پیامک) — SMS

```bash
MELIPAYAMAK_USERNAME=<web-service username>
MELIPAYAMAK_PASSWORD=<web-service password>
SMS_SENDER_NUMBER=<line>        # optional, until a dedicated line is issued
SMS_TEMPLATE_ID=<template>      # service-number template for one-time codes
```

Verified by 8 driver cases: `SendSMS/SendSMS` form fields
(`username`/`password`/`to`/`from`/`text`/`isFlash=false`), the
`SendSMS/BaseServiceNumber` template path for one-time codes, fallback to a
freeform code when no template is set, the panel's own error text surfaced on
failure (both `StrRetStatus` and `Message`), **both** documented success shapes
accepted (`RetStatus === 1` and `IsSuccessful === true`, each still requiring a
positive `Value` reception id), a success claim with no reception id refused,
refusal to send without a password, and one bad recipient failing the batch
rather than being dropped silently. See finding 10.

The one-time code never reaches the notify log or Sentry; only
`"کد یک‌بار مصرف"` and the delivery status are recorded.

**Not done:** no real message sent.

---

## Configuration verified in production mode

Asserted against a live `NODE_ENV=production` server:

- refuses to boot without `APP_SECRET` (≥32 chars), `DATABASE_URL`,
  `NEXT_PUBLIC_APP_URL`;
- `demoPayment: false` — the demo gateway is unreachable, and checkout refuses
  rather than marking an order paid;
- staff 2FA forced: a freshly created super_admin is redirected
  `/admin/users → /account/security?required=1` until enrolled;
- session cookie `Secure; HttpOnly; SameSite=lax`, 30-day cap, expiry enforced
  server-side;
- security headers on every response, `x-powered-by` absent, HSTS on a
  production host;
- `/admin`, `/dashboard`, `/account` are `noindex` and disallowed in robots.txt;
- no secret material in any sampled response (9 patterns, 6 paths).

---

## Remaining actions before go-live

In order. Items 1–3 are the conditions on the verdict.

1. **Set the real credentials** (`ZIBAL_MERCHANT`, `MELIPAYAMAK_USERNAME`,
   `MELIPAYAMAK_PASSWORD`) and confirm
   `curl -s $URL/api/health | jq .integrations`.
2. **Run the Playwright suite once in a browser** — `npm run test:e2e:install &&
   npm run test:e2e`, or let CI job `e2e` do it.
3. **Rehearse a restore** — `npm run backup:verify -- --dump <file.dump>`.
4. **Create the real administrator** — `npm run db:bootstrap-admin`, then sign in,
   enrol in 2FA, and confirm the demo admin is disabled.
5. **Take one real payment** for the cheapest item and follow it end to end:
   redirect → callback → `payments` row `paid` with a `refNumber` → enrolment →
   confirmation SMS.
6. **Send one real code** from `/auth` and confirm delivery plus the
   `/admin/notify` entry.
7. **Point `SENTRY_DSN`** at a real project; the SDK and secret scrubber are
   installed and tested, only the DSN is missing.
8. **Schedule the dump** and choose an RPO. Backups that are not scheduled do not
   exist.
9. **Copy `ci/ci.yml` to `.github/workflows/ci.yml`.** The canonical workflow
   (lint → typecheck → test → build → SEO audit → smoke → Playwright) lives in
   `ci/ci.yml`; the file in `.github/workflows/` is still the older four-step
   version. This session's GitHub token is refused on any path under
   `.github/workflows/` (`refusing to allow a GitHub App to create or update
   workflow … without workflows permission`), so it must be copied by a token
   that has the `workflows` scope. Until it is, the `e2e` gate in condition 2
   does not run automatically.

Full operational sequence: `GO_LIVE_CHECKLIST.md`.

---

## Evidence appendix

```
$ npm test
 Test Files  34 passed (34)
      Tests  327 passed (327)

$ npm run typecheck          # no output, exit 0
$ npm run lint               # 0 errors, 1 pre-existing warning
$ npm audit --omit=dev       # found 0 vulnerabilities
$ npm run seo:audit          # 0 ERROR, 0 WARN

$ npx tsx scripts/smoke.ts --base http://127.0.0.1:4700
SMOKE TEST PASSED — 36 checks

$ npx tsx scripts/security-audit.ts --base http://127.0.0.1:4700
SECURITY AUDIT PASSED — 66 checks

$ npx tsx scripts/scenario-test.ts --base ... --admin-phone ... --admin-password ...
SCENARIO SUITE PASSED — 16 checks

$ npx tsx scripts/load-test.ts --base http://127.0.0.1:4700 --concurrency 20 --seconds 20
total      1226 requests in 20.1s  →  61 req/s
latency    p50 329ms   p95 462ms   p99 539ms
errors     0 (0.00%)
LOAD PROBE PASSED — 1226 requests, p95 462ms within 1500ms, 0 errors

# production boot, database copied from the development seed
{"level":50,"event":"launch.check","code":"ADMIN_LOCKED_OUT",
 "message":"هیچ حساب مدیری قابل ورود نیست. یک مدیر واقعی بسازید: npm run db:bootstrap-admin"}
users: u-editor/u-support/u-maryam/u-sara → disabled=true, sessions revoked,
       4 × audit `user.disabled`

# real login over HTTP (Server Action POST)
real super_admin            303 → /admin                 az_session SET
demo admin (seed password)  303 → /auth?error=invalid    no session
```
