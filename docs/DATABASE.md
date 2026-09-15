# Database

PostgreSQL is the only supported production datastore. `data/db.json` is **not** the
runtime database any more — it survives only as the one-shot input to
`npm run db:migrate-json`.

## Layout

```
lib/db/schema.ts     Drizzle table definitions (source of truth for shape)
lib/db/client.ts     connection + transaction executor (postgres | pglite)
lib/db/commerce.ts   atomic stock/seat/payment SQL
lib/db/migrate.ts    applies drizzle/*.sql in filename order
lib/store.ts         document cache over the same tables (getters used by the UI)
drizzle/*.sql        numbered, re-runnable migrations
```

Every table carries both relational columns (used for constraints, indexes and
atomic updates) and a `payload JSONB` document (used by the UI). The two are kept
in step: `lib/db/commerce.ts` patches `payload` inside the same transaction that
changes the columns, and `syncCollections()` pulls the authoritative rows back
into the cache immediately afterwards.

## Connection

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | `postgres://user:pass@host:5432/db`. Required in production. |
| `DATABASE_SSL` | `true` to connect over TLS. |
| `PGLITE_DIR` | Development fallback location (default `data/pglite`). `memory` gives an ephemeral in-memory database — this is what the test suite uses. |

`lib/db/client.ts` hangs the handle off `globalThis`. Next.js can bundle this
module into more than one server chunk; without the singleton two copies would
each open their own connection, and for the embedded PGlite fallback the second
instance fails outright.

## Migrations

```bash
npm run db:migrate          # apply drizzle/*.sql (tracked in schema_migrations)
npm run db:generate         # drizzle-kit generate — new schema change
npm run db:push             # drizzle-kit push — dev only, never on production
```

`runMigrations()` records each applied file in `schema_migrations`, so re-running
is safe. Migrations are additive by convention (`ADD COLUMN IF NOT EXISTS`,
`CREATE INDEX IF NOT EXISTS`). Review any migration that drops or retypes a
column against real data before running it — see `docs/DEPLOY.md`.

## Concurrency model

Stock and class capacity are **reserved**, not decremented, when an order is
created:

| Column | Meaning |
|---|---|
| `products.stock` | units physically on hand |
| `products.reserved_stock` | units held by unpaid orders |
| `classes.remaining` | seats still open |
| `classes.reserved_seats` | seats held by unpaid orders |

Available to sell = `stock - reserved_stock` / `remaining - reserved_seats`
(`lib/stock.ts`). Each hold is a conditional `UPDATE … WHERE` inside a
transaction, so the database — not application memory — decides who gets the
last unit:

```sql
UPDATE products
   SET reserved_stock = reserved_stock + $2
 WHERE slug = $1 AND active
   AND (kind <> 'physical' OR allow_backorder OR (stock - reserved_stock) >= $2)
RETURNING reserved_stock;
```

Zero rows means the request lost the race. `reserveOrderLines()` throws inside
the transaction when any line fails, so a partially reserved order cannot
survive. On verified payment `settleOrderLines()` converts the hold into a real
decrement; on failure `releaseOrderLines()` hands it back. Both are guarded by
`orders.settled_at` / `orders.released_at` so they can only happen once.

`lib/store.ts` still writes whole collections (delete-then-upsert). That is
correct for a single Node process — the current cPanel deployment — but two
processes writing the same collection can clobber each other. Run one Node
process per database, or move the remaining collections to row-level writes
before scaling horizontally. The commerce columns above are already immune:
`reserved_stock` and `reserved_seats` are deliberately excluded from the
collection upsert.

## Constraints that matter

| Constraint | Why |
|---|---|
| `users (phone) UNIQUE`, `users (email) UNIQUE` | one account per person |
| `courses (slug)`, `products (slug)` PRIMARY KEY | stable public URLs |
| `enrollments (user_id, course_slug) UNIQUE` | no duplicate enrolment on a replayed callback |
| `payments (gateway_transaction_id) UNIQUE` | a gateway reference can only ever be recorded once |
| `payments (authority) UNIQUE` | one Zarinpal authority per attempt |
| `orders (authority) UNIQUE` | idem |
| `lesson_progress (user_id, lesson_id)` PRIMARY KEY | no duplicate progress rows |
| `seo_redirects (from_path) UNIQUE`, `status_code IN (301,308)` | one redirect per source, valid status only |
| `CHECK (price >= 0)`, `CHECK (stock >= 0)`, `CHECK (remaining >= 0)` | money and stock are never negative |

Money is an `INTEGER` count of **Toman** everywhere. Rial appears only at the
Zarinpal boundary (`lib/money.ts`). Never a float.

## Tests

`lib/__tests__/commerce.integration.test.ts` runs the real SQL against an
in-memory PGlite database: oversell protection, seat capacity, transaction
rollback, payment/enrolment idempotency. It is part of `npm test`.

PGlite is a single-connection embedded database, so those tests prove the
*guards* are correct but cannot reproduce a true multi-connection race. Run the
same scenarios against a real PostgreSQL instance before relying on them for
horizontal scaling.
