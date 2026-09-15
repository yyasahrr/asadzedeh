# Backup restore verification

`scripts/verify-backup-restore.ts` proves a dump can actually be restored and
that the restored data is consistent. It exists because an untested backup is
not a backup.

```bash
npm run backup:verify -- --dump backups/asadzedeh-2026-09-07-0300.dump
npm run backup:verify -- --dump backups/latest.dump --keep   # inspect afterwards
```

## What it does

1. Refuses to run against anything production-like (see below).
2. Creates a dedicated throwaway database named `asadzedeh_restore_*`.
3. Restores the dump with `pg_restore`, falling back to `psql` for plain-SQL
   dumps — the `embedded-postgres` package ships only `initdb`, `pg_ctl` and
   `postgres`, so the fallback matters on hosts without the client tools.
4. Runs 13 consistency checks.
5. Drops the throwaway database unless `--keep` was passed.

## The 13 checks

`verifyRestoredDatabase()` in `lib/backup/verify.ts` asserts:

1. the server answers and reports its version;
2. all 15 expected tables exist;
3. `users` is not empty;
4. `courses` is not empty;
5. `orders` is not empty;
6. the three required indexes are present;
7. no product has negative stock;
8. no class has negative remaining seats;
9. no order references a missing user;
10. no enrolment references a missing user;
11. no negative amount is stored anywhere;
12. every order has a status;
13. **no live session survives** — a restored database must not let a stale
    session cookie back in.

Plus: site settings must be present.

Check 13 is the one people forget. Restoring yesterday's dump reinstates
yesterday's sessions; the query requires
`COALESCE(payload->>'revokedAt','') = '' AND (expires_at IS NULL OR expires_at > now())`,
so any still-valid session fails the restore and you rotate them deliberately
instead of by accident.

## Safety rails

`assertRestorableUrl()` rejects a target whose host or database name contains
`prod`, `production`, `live` or `asadzedeh.ir`, and requires the database name
to start with `asadzedeh_restore_` or `asadzedeh_test_`. The script therefore
cannot restore over production even if you paste the wrong URL.

**Never restore over the production database directly.** Restore to a scratch
database, verify, and promote deliberately.

## Tests

`lib/__tests__/backup-verify.pg.test.ts` — 10 tests against a real PostgreSQL.
Six of them deliberately corrupt the restored database (drop a table, zero out
`orders`, set negative stock, leave a live session, …) and assert that
verification **fails**. Those are the tests that prove the checks actually
check something.

## RPO and RTO

See [BACKUP.md](./BACKUP.md). They are operational targets set by your dump
schedule and your ability to provision a host, not properties the application
enforces.
