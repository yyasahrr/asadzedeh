# Deploy

```text
                    Application PaaS  (Node 22, 1 replica)
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
      PostgreSQL PaaS                  Private Object Storage
      DATABASE_URL                     S3_ENDPOINT / S3_BUCKET
                                       S3_ACCESS_KEY / S3_SECRET_KEY
```

Three services, no shared disk. The application holds no state of its own:
everything it must keep is in PostgreSQL or object storage, so a redeploy is
harmless.

## Prerequisites

- **Node 22 or newer** (`package.json` → `engines.node >=22.0.0`). Next.js 16
  will not run on Node 20.
- **PostgreSQL 16+** reachable from the app.
- **S3-compatible object storage** with a **private** bucket (see
  [STORAGE.md](./STORAGE.md)).
- The app listens on `0.0.0.0:$PORT` (default `3000`) and expects to sit behind a
  reverse proxy that terminates TLS.

## First deploy

```bash
# 1. Install from the lockfile. No --legacy-peer-deps needed.
npm ci

# 2. Build. Requires APP_SECRET and NEXT_PUBLIC_APP_URL at build time.
APP_SECRET="$(openssl rand -hex 32)" \
NEXT_PUBLIC_APP_URL="https://your-domain.example" \
  npm run build

# 3. Migrate. Idempotent — safe to run on every deploy.
npm run db:migrate

# 4. Create the first administrator. Registration can never create an admin,
#    so this is the only way in. The account is created blocked and must enrol
#    in 2FA on first sign-in.
SUPER_ADMIN_PHONE=09120000000 \
SUPER_ADMIN_PASSWORD='a-long-unique-passphrase' \
  npm run db:bootstrap-admin

# 5. Start.
npm start          # node server.mjs
```

Set every variable through the platform's environment UI, never in a committed
file. See [.env.example](../.env.example) for the full list, grouped by
*required in production* / *optional* / *development only*.

Production **fails fast** if `APP_SECRET` (min 32 chars), `DATABASE_URL` or
`NEXT_PUBLIC_APP_URL` is missing. There is no JSON, SQLite or demo database to
fall back to.

## Verifying a deploy

```bash
curl -s "$NEXT_PUBLIC_APP_URL/api/health" | jq
```

```json
{
  "status": "ok",
  "db": "postgres",
  "storage": "s3",
  "storageConfigured": true,
  "integrations": { "sms": { "configured": true }, "payment": { "configured": true } },
  "commerceReady": true
}
```

`503` means the database did not answer. `storage: "local"` on a server means
uploads will not survive a redeploy.

Then check the boot log for `launch.check` lines. Codes worth acting on:

| Code | Level | Meaning |
|---|---|---|
| `ADMIN_LOCKED_OUT` | error | no administrator can sign in — run `db:bootstrap-admin` |
| `NO_OBJECT_STORAGE` | error | S3 not configured — uploads are refused |
| `NO_ADMIN_ACCOUNT` | error | database has no users at all |
| `INTEGRATION` | warn | payment gateway or SMS panel not configured |
| `ADMIN_SEED_PASSWORD` | warn | a retired demo admin still holds a dev password. Benign: the account is blocked and cannot sign in |

## Runtime behaviour

| Concern | Behaviour |
|---|---|
| Bind | `0.0.0.0:${PORT}`, `PORT` from the environment |
| Health | `GET /api/health` — 200 when PostgreSQL answers, else 503 |
| `SIGTERM` / `SIGINT` | stops accepting connections, drains, closes the pool, exits |
| Failed bind | logs `FATAL: could not listen…` and exits 1 (no restart loop mystery) |
| Unhandled rejection / uncaught exception | logged, exit 1 so the platform restarts |
| Logging | structured JSON on stdout (`LOG_LEVEL`, default `info` in production) |
| Connection pool | 10 connections, 20 s idle timeout, 15 s connect timeout |
| TLS to PostgreSQL | `DATABASE_SSL=true`; the server certificate **is** verified |

## Single-replica constraint

Run **one replica** for now. Two things are deliberately process-local:

- the rate limiter (`lib/rate-limit.ts`) is an in-memory sliding window, so two
  replicas double every limit;
- the reservation sweeper (`instrumentation-node.ts`) runs on a timer in each
  process.

The sweeper itself is safe to run twice — it takes `FOR UPDATE SKIP LOCKED`
inside a transaction and guards on `released_at IS NULL` — but the rate limiter
is not. Before scaling past one replica, move rate limiting into the reverse
proxy or a shared store.

## Rollback

1. Redeploy the previous build; keep the previous `.next` artefact if the
   platform does not retain builds.
2. Migrations are forward-only and additive. If a migration must be undone,
   restore from a backup rather than editing the schema by hand.
3. Object storage is never rewritten in place, so a rollback cannot orphan a
   video: keys are content-addressed by upload id.

## Backups

See [BACKUP.md](./BACKUP.md). PostgreSQL is the only thing that needs a
scheduled dump — object storage is backed up by its provider. Rehearse a
restore (`npm run backup:verify`) before launch; an untested backup is not a
backup.
