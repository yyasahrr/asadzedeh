# Deploy

1. Provision PostgreSQL 16 (`docker compose up -d postgres` locally).
2. Set production env from `.env.example` (`APP_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`).
3. `npm ci --legacy-peer-deps`
4. `npm run db:migrate`
5. `npm run db:migrate-json` once if you still have `data/db.json`.
6. `SUPER_ADMIN_PHONE=... SUPER_ADMIN_PASSWORD=... npm run db:bootstrap-admin`
7. `npm run build && npm start` (`server.mjs`, binds `0.0.0.0:$PORT`).
8. Put TLS in front (cPanel / nginx). HSTS is set by Next when `NODE_ENV=production`.

Health: `GET /api/health` — 200 when the database answers `SELECT 1`.

cPanel Node.js: startup file `server.mjs`, command `npm start`, Node 20+. Writable dirs: `data/`, `data/videos/`, `data/lesson-files/`. Do not use `data/db.json` as the production database.

Rollback: keep the previous `.next` build and previous Postgres dump (`docs/BACKUP.md`).
