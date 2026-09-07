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

## Configuration

Set in `/admin/payments` (site settings, not environment):

| Field | Meaning |
|---|---|
| `provider` | `zarinpal` or `demo` |
| `merchantId` | Zarinpal merchant id — **BLOCKED BY CREDENTIAL** until supplied |
| `sandbox` | use `sandbox.zarinpal.com` |

The callback URL is `${NEXT_PUBLIC_APP_URL}/api/payment/callback?order=<id>`,
so `NEXT_PUBLIC_APP_URL` must be the public HTTPS origin.

## What is still open

- **Zarinpal merchant id** — the integration is complete and unit-reachable, but
  no live credentials exist. Marked *BLOCKED BY CREDENTIAL*, not READY.
- **Refunds** — `REFUNDED` is a valid state in the machine, but there is no
  gateway refund call and no admin refund action. Manual refunds must be
  recorded through an audit-logged admin action before this is claimed.
- **Webhook** — Zarinpal's model here is a browser redirect. A paid order whose
  buyer never returns to the callback stays `AWAITING_PAYMENT` with stock
  reserved. A reconciliation job that queries the gateway for stale pending
  orders is the correct fix and does not exist yet.
