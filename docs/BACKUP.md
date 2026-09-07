# Backups

PostgreSQL is the source of truth.

```bash
pg_dump "$DATABASE_URL" -Fc -f backup.dump
# restore
pg_restore --clean --if-exists -d "$DATABASE_URL" backup.dump
```

Also snapshot:

- `data/videos/` and `data/lesson-files/` (or the S3 bucket)
- `data/object-store/` if S3 is not configured
- `data/seo-redirects.json` (consumed by `server.mjs`)

WAL `data/.store-wal.json` is a crash buffer, not a backup. Do not treat it as durable storage.

Run dumps daily off-host. Test a restore on a staging database before you need it.
