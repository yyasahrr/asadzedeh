# Payments

## Money

Integer **Toman** end to end (`orders.amount`, `payments.amount`, `products.price`).
Rial exists only at the Zarinpal boundary (`tomanToRial` in `lib/money.ts`).
No floats anywhere in the money path.

## The browser never sets a price

`app/checkout/actions.ts` accepts identifiers only — `kind`, `slug`, `qty`,
`coupon`, `shippingMethod`, contact fields. `lib/checkout-lines.ts#buildLines`
re-reads every price, title and availability flag from the store and returns the
authoritative `OrderLine[]`. A cart that posts `price: 1` is charged the real
price; the unit test for this is `lib/__tests__/checkout-lines.test.ts` and the
browser-level regression is `e2e/security.spec.ts`.

## Order lifecycle

`lib/order-status.ts` holds the state machine:

```
PENDING → AWAITING_PAYMENT → PAID → PROCESSING → SHIPPED → DELIVERED
                ↓                ↓
            CANCELLED        REFUNDED
                ↑
              FAILED → AWAITING_PAYMENT | CANCELLED
```

`assertTransition()` rejects illegal moves. Persian labels stay in the UI
(`ORDER_LABEL`); `parseOrderState()` maps them back.

Payments have their own states: `pending | paid | failed | cancelled`, stored in
the `payments` table (one row per attempt, keyed to the order).

## Flow

1. **Checkout** — `buildLines` → `reserveOrderLines()` (atomic holds) →
   `orders` row in `AWAITING_PAYMENT` → `order_items` rows → `payments` row
   (`pending`) → Zarinpal `payment/request` → redirect to the gateway.
   Demo mode settles immediately.
2. **Callback** — `GET /api/payment/callback?order=…&Authority=…&Status=…`.
   `Status` is never trusted; it only decides whether to ask the gateway.
   `verifyPayment()` performs the server-to-server `payment/verify` call, and only
   its response can move a payment to `PAID`.
3. **Fulfilment** — `finalizePaidOrder()` settles stock/seats, creates
   enrolments (and SpotPlayer licences where configured) and sends the
   confirmation SMS.

## Idempotency

Gateway callbacks arrive more than once. Every step is protected at the
database level:

| Step | Guard |
|---|---|
| Payment → PAID | `UPDATE payments SET status='paid' WHERE id=$1 AND status <> 'paid'` — second call updates 0 rows |
| Duplicate gateway reference | `UNIQUE (gateway_transaction_id)` → unique violation is caught and treated as a replay |
| Order → PAID | `UPDATE orders … WHERE id=$1 AND status <> $2` |
| Stock settle | `orders.settled_at` set once |
| Stock release | `orders.released_at` set once |
| Enrolment | `UNIQUE (user_id, course_slug)` + `ON CONFLICT DO NOTHING` |

When both conditional updates report "already done", the callback logs
`payment.replay.ignored`, writes an audit entry and redirects to the success
page without re-enrolling, re-decrementing stock or re-sending SMS.
Covered by `lib/__tests__/commerce.integration.test.ts`.

## Demo gateway

`lib/env.ts#demoPaymentAllowed()` returns `false` when
`NODE_ENV=production` unless `ALLOW_DEMO_PAYMENT=true` is set explicitly.
`isDemoPayment()` therefore cannot silently become true in production, and
`assertProductionSecrets()` refuses to boot without `DATABASE_URL`, a ≥32-char
`APP_SECRET` and `NEXT_PUBLIC_APP_URL`.

Never set `ALLOW_DEMO_PAYMENT=true` on a host that takes real money.

## Gateways

`lib/gateways/` holds one file per PSP behind a single interface
(`request` / `verify`). Adding one is a file, a registry entry and an id in
`PAYMENT_PROVIDERS`; nothing else changes.

| Gateway | Credential | Amount unit | Sandbox |
|---|---|---|---|
| **Zibal (زیبال) — launch** | `merchant` string | Rial | the literal merchant `zibal` |
| Zarinpal | merchant id (UUID) | Rial | `sandbox.zarinpal.com` |
| IDPay | API key | Rial | `x-sandbox: 1` |
| PayPing | client id + secret | Rial | n/a |

`demo` is not a gateway: it is the absence of one, and it is unreachable in
production.

## Configuration

Two places, and **the environment wins** whenever it has a value:

```bash
ZIBAL_MERCHANT=your-merchant-string
PAYMENT_PROVIDER=zibal
PAYMENT_SANDBOX=false
```

| Field | Environment | Admin panel (`/admin/payments`) |
|---|---|---|
| provider | `PAYMENT_PROVIDER` | dropdown |
| credential | `ZIBAL_MERCHANT` / `PAYMENT_MERCHANT_ID` | merchant field |
| second credential (PayPing only) | `PAYMENT_SECRET` | secret field |
| sandbox | `PAYMENT_SANDBOX` | checkbox |

Setting `ZIBAL_MERCHANT` alone is enough — the provider is inferred as `zibal`
when the stored provider is still `demo`.

**Sandbox in production is opt-in only.** The stored default is
`sandbox: true`, which is right on a laptop and wrong on a live shop, so in
production the sandbox is enabled solely by `PAYMENT_SANDBOX=true`. See
`effectivePaymentSettings()` in `lib/integrations.ts`.

The callback URL is `${NEXT_PUBLIC_APP_URL}/api/payment/callback?order=<id>`,
so `NEXT_PUBLIC_APP_URL` must be the public HTTPS origin.

## Zibal specifics

- `POST https://gateway.zibal.ir/v1/request` with
  `{ merchant, amount, callbackUrl, orderId, mobile, description }`; success is
  `result === 100` with a `trackId`, and the buyer is sent to
  `https://gateway.zibal.ir/start/<trackId>`.
- `POST https://gateway.zibal.ir/v1/verify` with `{ merchant, trackId }`.
  `result === 100` is a fresh confirmation and `201` means *already verified* —
  the driver reports that as `alreadyVerified` so a replayed callback cannot look
  like a new payment.
- A verified `amount` that does not equal `order.amount × 10` is rejected even
  when the gateway returns a reference number. A reference is not proof that
  *this* order was paid.
- `request` is never retried (a retry would create a second transaction);
  `verify` is retried up to 3 times because it is idempotent.

Covered by `lib/__tests__/integrations.test.ts` (7 Zibal cases) and
`lib/__tests__/payment-gateways.test.ts`.

## Verifying a live connection

```bash
curl -s "$NEXT_PUBLIC_APP_URL/api/health" | jq .integrations.payment
# { "configured": true, "provider": "zibal", "sandbox": false, "fromEnvironment": true }
```

Then place a real order for the cheapest item and confirm: the redirect reaches
`gateway.zibal.ir/start/…`, the callback returns to `/checkout/success`, the
`payments` row is `paid` with a `refNumber`, and the order is enrolled. That is
the one test no amount of unit coverage can replace.

## What is still open

- **Live credentials** — the Zibal and MeliPayamak boundaries are implemented and
  their wire formats are pinned by tests, but no live transaction has been made
  from this repository. Marked *PENDING CREDENTIAL*, not READY.
- **Gateway credentials in the repo** — none exist. `ZIBAL_MERCHANT` and the
  MeliPayamak password are supplied by the operator at deploy time.
- **Refunds** — `REFUNDED` is a valid state in the machine, but there is no
  gateway refund call and no admin refund action. Manual refunds must be
  recorded through an audit-logged admin action before this is claimed.
- **Webhook** — Zarinpal's model here is a browser redirect. A paid order whose
  buyer never returns to the callback stays `AWAITING_PAYMENT` with stock
  reserved. A reconciliation job that queries the gateway for stale pending
  orders is the correct fix and does not exist yet.
