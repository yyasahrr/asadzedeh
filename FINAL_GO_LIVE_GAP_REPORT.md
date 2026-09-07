# Final Go-Live Gap Report

**Status: every gap identified in this audit is closed.** What remains open is
listed at the end, and none of it is a correctness defect in this repository.

This report was written first, then implemented. Each entry keeps the evidence
that the fix is real — a test name or a command — so the claim can be checked
rather than taken on trust.

Scope of the audit: `lib/`, `app/`, `server.mjs`, `scripts/`, `drizzle/`,
`docs/`, config files. Stack unchanged: Next.js App Router, TypeScript,
Tailwind v4, PostgreSQL, Drizzle, Zod, Vitest, Pino, Sentry, S3-compatible
storage.

---

## Verification commands

| Command | Result |
|---|---|
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` | 0 errors (`tsc --noEmit`) |
| `npx vitest run` | **196 passed, 24 files** |
| `npm run build` | compiled successfully, 49 static pages |
| `npm run seo:audit` | `PASS`, 0 ERROR / 0 WARN |
| `npx tsx scripts/smoke.ts` | **36/36** against real PostgreSQL 18.4 |
| `npm run backup:verify` | 13 checks pass; 6 of its tests corrupt a restore and require failure |
| `npx playwright test` | **never executed** — see [Open items](#open-items) |

---

## CRITICAL — all closed

### C1 — Paid-order finalisation was not one transaction — **FIXED**
`lib/db/commerce.ts` → `finalizePaidOrderTx()`. The order is locked
`SELECT … FOR UPDATE`, short-circuits when `settled_at` or `released_at` is set,
and settles stock, seats, payment, order and enrolment in a single transaction.
Returns `finalized | already-finalized | not-found`.
**Evidence:** `commerce.pg.test.ts` — 3 parallel finalisations produce exactly
1 `finalized`; an FK violation rolls the whole transaction back.

### C2 — Ticket/chat persistence had a second authoritative store — **FIXED**
The write-ahead log is gone. `server.mjs` reads and writes tickets and messages
through the `postgres` package directly; PostgreSQL is the only store. The
server refuses to boot without `DATABASE_URL`.
**Evidence:** `grep -r "STORE_WAL_PATH"` returns nothing; `scripts/smoke.ts`
asserts `/api/health` reports `"db":"postgres"`.

### C3 — Duplicate certificate issuance was possible — **FIXED**
`insertCertificateIfAbsent()` uses
`ON CONFLICT (user_id, course_title) WHERE revoked_at IS NULL DO NOTHING
RETURNING code`; a `23505` is treated as "already issued", not an error.
**Evidence:** `commerce.pg.test.ts` — 4 parallel issuances produce 1
certificate; reissue after revoke succeeds.

### C4 — The store wrote whole collections on every mutation — **FIXED**
`persist()` wrote `DELETE FROM <table> WHERE <pk> NOT IN (<rows I hold>)` plus an
upsert per row. Correct for one process; with two, each write deleted the other's
rows. `replaceTable()` now takes `{ prune }`, and the append-only tables —
`orders`, `payments`, `enrollments`, `certificates`, `audit_logs`, `tickets` —
pass `prune: false`. Certificates have a real delete flow, so they get an
explicit `deleteStoreRow()`. Content collections keep pruning, because the admin
delete buttons depend on it.
**Evidence:** `concurrent-writers.pg.test.ts` (7 tests). These discriminate:
with `prune: true` restored, exactly the 4 data-loss tests fail and the 2 that
should behave identically either way still pass.

---

## HIGH — all closed

### H1 — Zod was used in exactly one place — **FIXED**
`lib/validation/` now holds `schema.ts`, `form.ts`, `auth.ts`, `admin.ts` and
`legacy.ts`. Every mutation boundary validates.
This also closed a real privilege escalation: `updateUserRole` accepted
`str(fd, "role")` with no allowlist, so any staff member could grant themselves
`super_admin`. `ASSIGNABLE_ROLES` now excludes it.
**Evidence:** `validation.test.ts` (23), `authorization.test.ts` (23).

### H2 — Five of six outbound HTTP calls had no timeout — **FIXED**
`lib/http.ts` → `fetchWithTimeout({ timeoutMs = 10_000, retry?, event? })`,
30 s hard cap. Retries are **opt-in per call** (`retry` only passed on
idempotent calls: payment verification retries, payment *creation* does not).
Backoff `min(base·2^n + jitter, 8000)` on 408/425/429/5xx.
**Evidence:** `http.test.ts` (7).

### H3 — Sentry was decorative — **FIXED**
`@sentry/nextjs` with `sentry.{server,edge,client}.config.ts` and
`lib/sentry-scrub.ts`. `beforeSend` strips password, session token, cookies,
2FA secret, recovery code, `Authorization`, and SMTP/SMS/payment secrets.
**Evidence:** `sentry-scrub.test.ts` (10).

### H4 — No IDOR regression coverage — **FIXED**
`lib/__tests__/helpers/next-runtime.ts` is a Next-runtime double that lets
server actions be called as a specific user. 23 tests assert that a student
cannot read another student's orders, an instructor cannot edit another
instructor's course, and every admin action enforces its own permission —
action-level, not page-level.
**Evidence:** `authorization.test.ts` (23).

### H5 — Lesson progress accepted arbitrary lesson ids — **FIXED**
`setLessonProgress` verifies the lesson belongs to the course *and* that the
user owns an enrolment in it.
**Evidence:** covered in `authorization.test.ts`.

---

## MEDIUM — all closed

### M1 — The runtime WAL was still a read path — **FIXED**
Removed entirely; see C2. This also resolved L2 (the Turbopack dynamic-`require`
warning came from the WAL's `fs.readFileSync`).

### M2 — `npm run seo:audit` exit code — **VERIFIED CORRECT, no change needed**
The audit already exits `errors > 0 ? 1 : 0`, so ERROR fails CI and WARN only
reports. Rather than assume that, it was measured by injecting a finding:
one ERROR → **exit 1**; WARN-only → **exit 0**. Output carries route context.

### M3 — Checkout did not detect a price change — **FIXED**
Checkout already re-read every price server-side, so a stale cart could never
change what was charged — but it also never told the shopper. `buildLines()` now
returns `priceChanges[]` and checkout redirects back with the item name and both
amounts in Persian digits. A missing/zero/NaN cart price is ignored rather than
flagged, so existing sessions are not blocked.
**Evidence:** `checkout-lines.test.ts` (15, of which 6 are new).

### M4 — Upload atomicity was not compensated — **FIXED**
Three defects, all closed:
- the stored extension came from the client **filename**; a file named
  `invoice.html` sent as `image/png` was stored as `.html`. Now derived from the
  declared MIME type via `extensionForContentType()`.
- if the audit write or cache refresh threw, the object was orphaned. It is now
  rolled back.
- `deleteMedia()` deleted from `public/<path>`, but uploads live in
  `data/object-store/` and are served from `/api/media/<key>` — so **deletes
  silently did nothing**. It now resolves the key and calls `deleteObject()`.
**Evidence:** `storage.test.ts` (9).

### M5 — `docker-compose.yml` was undocumented as dev-only — **FIXED**
Header states it is development-only and lists what production needs that it
lacks. Credentials come from the environment with placeholder defaults, the port
binds to loopback, and the cluster initialises as UTF-8.

---

## LOW

### L1 — `resetDb()` is exported — **reviewed, accepted**
Guarded twice: `isProduction()` throws, and `resetDemoData()` additionally
requires `isSuperAdmin` and redirects in production. Removing it would break the
dev reset button for no security gain.
**Note:** C4 changed its behaviour (the prune no longer clears append-only
tables), so `resetDb()` now deletes those six tables explicitly. Covered by a
test in `concurrent-writers.pg.test.ts`.

### L2 — Turbopack warning at the WAL read — **RESOLVED** by M1.

---

## Additional defects found by the new smoke test

The smoke test (item 12) was written before these were known, and found all
three on a real PostgreSQL-backed production build.

### Payload columns were double-encoded JSON strings — **FIXED**
Passing `JSON.stringify(x)` to a `$n::jsonb` parameter makes the `postgres`
driver jsonb-serialise it *again*, storing `"{\"a\":1}"`. Reads survived because
everything went through `JSON.parse`, but no jsonb operator could see inside the
value: `payload || patch`, `payload->'key'` and `payload ? 'key'` all silently
did nothing. Now bound `::text::jsonb`, and `replaceTable()` casts explicitly.
`drizzle/0003_payload_json_objects.sql` unwraps rows written before the fix.
**Evidence:** `payload-encoding.pg.test.ts` (4).

### The document cache was not shared between server chunks — **FIXED**
`lib/store.ts` kept `cache`/`ready`/`initPromise` in module-level variables.
Next bundles the module into several server chunks, so the chunk that ran
`initStore()` at boot held the data while the chunk rendering a page held an
empty shell — and the cache was initialised to `emptyDb()`, so the "have we
loaded yet?" test could never tell. `GET /` and `/instructors` returned **500**
reading `instructors[0].image`. The WAL had been masking this. State now hangs
off `globalThis`, like `lib/db/client.ts` already did.
**Evidence:** `store-bootstrap.test.ts` (4).

### Test databases were SQL_ASCII — **FIXED**
The embedded PostgreSQL defaulted to SQL_ASCII, so `payload::text` on Persian
text raised `invalid byte sequence for encoding "UTF8"`. Clusters now initialise
`--encoding=UTF8 --locale=C.UTF-8`. A SQL_ASCII cluster hides real encoding
bugs, so this is kept.

---

## Verified as already correct (no action)

| Area | Evidence |
|---|---|
| Socket.IO authentication | `server.mjs` middleware rejects unauthenticated sockets before `io.on("connection")` |
| Socket room authorization | `ticket:join` re-checks `ticket.userId !== user.id` server-side; client room ids are not trusted |
| Socket abuse limits | 20 messages/60 s per socket, 2000-char cap, `maxHttpBufferSize: 10_000` |
| Graceful shutdown | `SIGTERM`/`SIGINT` → `io.close()` → `httpServer.close()` → `sql.end({timeout:5})`, 10 s force-exit |
| Checkout price integrity | `lib/checkout-lines.ts` re-reads every price; 15 tests |
| Payment idempotency | conditional `UPDATE … WHERE status <> 'paid'` + `UNIQUE (gateway_transaction_id)` |
| Inventory cannot oversell | conditional `UPDATE … WHERE (stock - reserved_stock) >= $n`; 25 parallel on stock 3 → exactly 3 wins |
| Capacity cannot overbook | conditional `UPDATE … WHERE (remaining - reserved_seats) > 0`; 20 parallel on 4 → exactly 4 |
| Production demo-payment guard | `demoPaymentAllowed()` false in production unless `ALLOW_DEMO_PAYMENT=true` |
| Seed admin in production | `ensureSeedUsers()` returns early on `NODE_ENV=production` |
| Security headers | 5 headers present, `x-powered-by` absent — asserted on **real responses** by the smoke test |
| robots/sitemap | `Sitemap: https://asadzedeh.ir/sitemap.xml`; sitemap URL list non-empty |
| CSRF | cross-origin Server Action rejected (500, `x-forwarded-host` ≠ `origin`) |

---

## Open items

None of these is a correctness defect that this repository can close.

| Item | Status | Why |
|---|---|---|
| Playwright E2E | **NOT EXECUTED** | `cdn.playwright.dev` is unreachable from this sandbox (`playwright install chromium` fails with a TLS socket disconnect). The specs and config are written and typecheck. **This must run in CI before Go-Live.** Do not mark E2E READY until a browser has actually run. |
| Zarinpal merchant id | **BLOCKED BY EXTERNAL CONFIGURATION** | Boundary implemented and tested against the demo provider. |
| S3 endpoint/bucket/keys | **BLOCKED BY EXTERNAL CONFIGURATION** | Signed PUT and DELETE implemented; local storage is the fallback. |
| SpotPlayer API key | **BLOCKED BY EXTERNAL CONFIGURATION** | Boundary implemented. |
| SMS provider API key | **BLOCKED BY EXTERNAL CONFIGURATION** | Boundary implemented. |
| SMTP credentials | **BLOCKED BY EXTERNAL CONFIGURATION** | Boundary implemented. |
| Sentry DSN | **BLOCKED BY EXTERNAL CONFIGURATION** | SDK and scrubber are installed and tested; only the DSN is missing. |
| Password reset flow | **NOT IMPLEMENTED** | The `password_resets` table exists and is empty, but no action or route uses it. Users who lose their password need an admin to reset it. Not a Go-Live blocker for a small catalogue, but it should be on the roadmap. |
| `npm audit` | 4 moderate, dev-only | All reachable only through `drizzle-kit` (a build tool, not shipped). The published "fix" downgrades `drizzle-kit` to 0.18.1. **Risk accepted deliberately** — do not run `npm audit fix --force`. |
