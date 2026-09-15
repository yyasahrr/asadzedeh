# SMS — ملی پیامک (MeliPayamak)

The launch panel is **MeliPayamak**. The panel layer (`lib/sms.ts`) also supports
Kavenegar, Ghasedak and sms.ir; nothing else in the codebase branches on a
provider name.

## Configure

Two variables are enough. The provider is inferred as `melipayamak` as soon as a
username is present:

```bash
MELIPAYAMAK_USERNAME=your-webservice-username
MELIPAYAMAK_PASSWORD=your-webservice-password
# optional, and worth having:
SMS_SENDER_NUMBER=3000xxxx        # a dedicated line, once the panel issues one
SMS_TEMPLATE_ID=123456            # service-number template for one-time codes
```

In cPanel these go in the Node.js application's **Environment Variables** block;
on a VPS, in the systemd unit or the shell that starts `server.mjs`. Changing
them needs a restart — they are read at request time from the process
environment, but the process itself must be restarted to pick up new values.

The same fields exist in `/admin/settings`; the environment takes precedence and
the page says so when it is being overridden.

## What is sent, and when

| Trigger | Path | Call |
|---|---|---|
| Login one-time code | `app/auth/actions.ts` → `sendSmsCode` | `SendSMS/BaseServiceNumber` when `SMS_TEMPLATE_ID` is set, otherwise a freeform `SendSMS` |
| Password reset code | `lib/password-reset.ts` → `sendSmsCode` | same |
| Order confirmation | `finalizePaidOrder` → `sendSms` | `SendSMS/SendSMS` |
| Admin broadcast | `/admin/notify` → `sendSms` | `SendSMS/SendSMS` |

`SendSMS` is `POST`ed as `application/x-www-form-urlencoded` with
`username`, `password`, `to`, `from`, `text`, `isFlash=false`; success is
`RetStatus === 1` **and** a positive `Value`. Anything else is surfaced with the
panel's own `StrRetStatus` text, so "اعتبار کافی نیست" reaches the operator
instead of a generic failure.

## Delivery is never assumed

`sendSmsCode` returns `{ ok: false }` when no panel is configured — in
production it never logs the code and pretends it was sent. That matters because
the OTP flow tells the user to wait for a message; a silent no-op would leave
them waiting for something that does not exist.

The code itself never reaches the notify log or Sentry: only
`"کد یک‌بار مصرف"` is recorded, with the delivery status.

## Failures

- **Panel down / timeout** — 10 s timeout, up to 2 attempts (`lib/http.ts`).
  A failed send is logged to `/admin/notify` and returned to the caller; the
  order or login flow degrades but does not crash.
- **Out of credit** — the panel's message is shown. There is no retry, because
  retrying an unpaid panel does not make it paid.
- **Invalid number** — one bad recipient fails the batch and is reported, rather
  than silently dropping the others.

## Rate limits

Codes are rate-limited per phone number and per IP (`lib/rate-limit.ts`,
`lib/otp.ts`), so a hostile client cannot drain the panel's credit. The limits
are covered by `lib/__tests__/rate-limit.test.ts`.

## Verifying

```bash
curl -s "$NEXT_PUBLIC_APP_URL/api/health" | jq .integrations.sms
# { "configured": true, "provider": "melipayamak", "fromEnvironment": true }
```

Then request a login code from `/auth` (tab «ورود با کد پیامکی») and confirm the
message arrives and that `/admin/notify` shows it as sent.

The wire format is pinned by `lib/__tests__/integrations.test.ts` (6 MeliPayamak
cases): endpoint URL, form fields, template path, error mapping, and the refusal
to send without a password.
