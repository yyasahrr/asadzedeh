# Backups and restore

PostgreSQL is the single source of truth. There is no JSON file or write-ahead
log standing in for the database any more — if PostgreSQL is lost and there is
no dump, the data is gone.

## What must be backed up

| Data | Where it lives | How |
|---|---|---|
| Everything transactional | PostgreSQL | `pg_dump` (below) |
| Lesson videos | `data/videos/` or the S3 bucket | file/bucket snapshot |
| Lesson attachments | `data/lesson-files/` | file/bucket snapshot |
| Uploaded media | `data/object-store/` **only if S3 is not configured** | file snapshot |
| Redirects imported before v0.1.0 | `data/seo-redirects.json` | file snapshot |

When S3 is configured, media lives in the bucket and `data/object-store/` stays
empty — do not add it to the backup set, and do make sure the bucket has
versioning enabled instead.

## Dumping

```bash
# Custom format: compressed, parallel-restorable, selective.
pg_dump "$DATABASE_URL" -Fc -f "asadzedeh-$(date -u +%F-%H%M).dump"
```

Plain SQL (`-Fp`) also works and is the fallback when `pg_restore` is not
available on the host, but it is larger and cannot restore a single table.

## Restoring

```bash
# 1. Verify the dump before you touch anything real.
npm run backup:verify -- --dump asadzedeh-2026-09-07-0300.dump

# 2. Restore into a fresh database (never over a live one).
createdb asadzedeh_restore_check
pg_restore -d "$RESTORE_URL" asadzedeh-2026-09-07-0300.dump
```

`npm run backup:verify` does this for you against a dedicated throwaway
database, runs 13 consistency checks, and drops it again afterwards. It refuses
to run against anything that looks like production. See
[backup-restore.md](./backup-restore.md).

## RPO and RTO

These are **operational targets, not properties the application enforces**. The
app writes to PostgreSQL synchronously and does not buffer, so the window is
entirely determined by how often you dump and how fast you can restore.

| Target | Value | What it depends on |
|---|---|---|
| **RPO** (max acceptable data loss) | **24 hours** with a daily dump; **≤ 5 minutes** if you enable streaming replication or `archive_command` WAL archiving | Dump schedule / archiving, configured by the operator |
| **RTO** (max acceptable downtime) | **≤ 1 hour** for a restore into an existing server; **≤ 4 hours** including provisioning a replacement host | Host provisioning, DNS, `npm run db:migrate`, file restore |

To actually hold a 5-minute RPO you must do one of:

- run a standby with streaming replication, or
- set `archive_mode = on` and an `archive_command` that ships WAL off-host, so a
  base backup plus WAL can be replayed to any point in time.

Neither is configured by this repository — they are hosting decisions. Record
which one you chose and when you last rehearsed it.

## Restore rehearsal

Schedule a restore test at least quarterly, and after every schema migration:

```bash
npm run backup:verify -- --dump <latest.dump> --keep
```

`--keep` leaves the restored database in place so you can inspect it. Drop it
yourself when you are done. A backup that has never been restored is a
hypothesis, not a backup.
