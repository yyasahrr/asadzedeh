# Release Candidate Report — اسدزاده (Asadzadeh)

**Date:** 2026-09-15
**Branch:** `arena/01a0a4f5-asadzedeh`
**Scope:** turn the project from a development codebase into a Production Release Candidate, without real external credentials.

---

## Production Readiness

# CONDITIONALLY READY

Code, configuration, storage architecture, security posture and tests are release-grade. Three things stand between this and unconditional **READY**, and none of them is a code defect — all three need something only the operator can supply or run.

---

## تغییرات انجام‌شده (file by file)

### CI/CD
| File | Change |
|---|---|
| `.github/workflows/ci.yml` | Replaced the stale tracked workflow. It had `branches: [main, arena]`, which never matches this branch (the pattern needs `arena/**`), pinned Node 20 against an `engines` floor of `>=22`, and lacked the `seo:audit`, `npm audit`, `smoke` and `e2e` jobs. Now: lint → typecheck → test → seo → build → audit, plus a PostgreSQL-backed smoke job and a Playwright job. |
| `ci/ci.yml` | **Deleted.** It was a copy that GitHub Actions never executed — two workflows that could drift apart. |

> ⚠️ **This change is committed locally but could not be pushed.** The GitHub App token in this environment lacks the `workflows` scope, so `git push` is refused for any path under `.github/workflows/`. It must be pushed from an account with that permission.

### Storage layer
| File | Change |
|---|---|
| `lib/storage/index.ts` | Rewritten. Adds S3 multipart upload (initiate / part / complete / abort), streaming reads with `Range`, `headObject`, `objectExists`, strict `isValidObjectKey`, and SigV4 signing for GET/PUT/POST/DELETE/HEAD. Every header sent is also signed. |
| `lib/env.ts` | `s3Credentials()` accepts both `S3_ACCESS_KEY`/`S3_SECRET_KEY` and the AWS-standard `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`. Declared `LOG_LEVEL` and `VIDEO_SIGNING_SECRET` (both were read from `process.env` without being in the schema). Added `DATABASE_SSL_REJECT_UNAUTHORIZED`. |

### Video (no longer touches the container disk)
| File | Change |
|---|---|
| `lib/video.ts` | Rewritten around object keys (`videos/<id>.<ext>`). Multipart lifecycle with the part list persisted on the record; retried chunks cannot create duplicate billable parts; failed finalise aborts the upload; `reapStaleUploads()` cancels abandoned ones. FFmpeg is no longer a dependency — `ffmpegStatus()` reports unavailability with a reason. |
| `lib/types.ts` | `VideoStatus` gains `"uploading"`; `VideoAsset.upload` carries the in-flight multipart state. |
| `app/api/video/upload/route.ts` | Multipart to object storage instead of chunk files on disk. Refuses with `503` in production when object storage is unconfigured, rather than accepting a file it cannot keep. |
| `app/api/video/[id]/stream/route.ts` | Proxies byte ranges from object storage. Re-checks the **live session** on every request, so a revoked or logged-out student stops mid-playback instead of finishing the lesson. |
| `app/api/video/[id]/token/route.ts` | Delivery source is explicitly `file`; no implicit HLS/watermark path. |
| `app/api/video/[id]/hls/[...file]/route.ts` | Authorization first, then an explicit `410` — no local-disk read, and "not produced" is distinguishable from "lost". |

### Other runtime writes
| File | Change |
|---|---|
| `lib/lesson-files.ts` | Rewritten to object storage (`lesson-files/<id>`). |
| `app/api/lesson-files/upload/route.ts`, `app/api/lesson-files/[id]/route.ts` | Object storage; authorization resolved **before** any storage call. |
| `app/api/media/[...key]/route.ts` | Now actually proxies object storage (it returned a hard `404` whenever S3 was configured) and refuses the `videos/` and `lesson-files/` prefixes. |
| `lib/audit.ts` | In production the NDJSON copy goes to structured stdout instead of `data/audit.log`. The hash-chained database copy is unchanged. |
| `instrumentation-node.ts` | The existing sweeper also reaps abandoned video uploads. |

### Reliability / security hardening
| File | Change |
|---|---|
| `lib/db/client.ts` | `DATABASE_SSL=true` now **verifies** the server certificate; opt out explicitly per host. |
| `lib/launch-check.ts` | New `NO_OBJECT_STORAGE` finding at **error** level in production. |
| `server.mjs` | Re-validates redirect targets as local paths before emitting `Location`; handles listen failures; logs and exits non-zero on unhandled rejection / uncaught exception; null-safe shutdown when `DATABASE_URL` is unset; clearer fatal message. |
| `.env.example` | Rewritten into three groups: required in production / optional / development-only. |
| `.gitignore` | `data/object-store/`, `data/lesson-files/`, `data/db.json.migrated`. |
| `data/db.json.migrated`, `data/lesson-files/lf-…pdf` | Removed from version control (a migration artefact and a committed upload). |
| `docs/STORAGE.md` *(new)*, `docs/DEPLOY.md` | Architecture, env, first deploy, health contract, launch-check codes, rollback, single-replica constraint. |
| Admin UI (`videos/page.tsx`, `videos/settings/page.tsx`, `CourseForm.tsx`, `admin/actions.ts`) | Report ffmpeg state honestly instead of implying a transcode happened. |

---

## مشکلات پیدا شده

### CRITICAL
**Unauthenticated download of paid course videos via the public media route.**
`app/api/media/[...key]/route.ts` is unauthenticated by design (it serves site imagery) and holds the storage credentials. While making it proxy object storage I left it accepting *any* valid key, so `GET /api/media/videos/<key>` would return a course video with no session and no enrolment. The bucket being private did not help, because the route itself is credentialed.
- **Fix:** the route refuses the `videos/` and `lesson-files/` prefixes, answering `404` — the same as a missing object, so existence cannot be probed.
- **Regression test:** `lib/__tests__/video-storage.test.ts` → *"the public media route cannot reach private material"*.
- **Verified end-to-end** against a production server: `/api/media/videos/v-abc.mp4` → `404`, `/api/media/lesson-files/lf-abc.pdf` → `404`.

### HIGH
1. **`DATABASE_SSL=true` disabled certificate verification** (`lib/db/client.ts`) — `rejectUnauthorized: false` meant anyone on the path could impersonate the managed PostgreSQL and read every query. Now verified by default; opt-out is a separate, loudly named variable.
2. **Every admin-uploaded image broke in production.** `putObject` returned `/api/media/<key>` while that route hard-`404`'d whenever S3 was configured — so configuring object storage correctly would silently break all site imagery. Fixed by proxying.

### MEDIUM
3. **`isValidObjectKey("videos/../secret")` returned `true`.** This function is the guard on the public media route. Now rejects any `.`/`..` segment.
4. **`resolveVideoKey` silently normalised traversal** — `../../etc/passwd` became `videos/passwd`, which reads as success and hides the attempt from the log. Now returns `null`.
5. **Open-redirect surface in `server.mjs`.** The redirect layer reads `seo_redirects` directly and emitted `Location` without re-checking. The admin panel validates, but a row written by a migration or by hand bypassed it. Now re-validated at the point of use.
6. **Audit trail written to an ephemeral disk in production** — a file that disappears precisely when someone needs it. Moved to structured stdout.

### LOW
7. `server.mjs` had no listen-error handler (an opaque throw and a restart loop) and no unhandled-rejection handler (serving from a corrupted state).
8. Shutdown dereferenced `sql` when `DATABASE_URL` was unset, turning a clean stop into a crash on the way out.
9. Committed runtime artefacts: `data/db.json.migrated`, an uploaded lesson PDF.
10. Dead ffmpeg stubs that always returned `null`/`false` — misleading, since a caller could read them as a working feature. Removed.

### OPEN — observed, not fixed
**`TypeError: Cannot read properties of null (reading 'id')`** appears in the server log when the security audit fires hostile Server Action probes without a session. I could not attribute it to a specific action within this pass. It did **not** produce a 5xx on the probe burst (`security-audit`: *"40 requests, 0 5xx"*), and Next.js does not return the stack to the client in production, so it is a robustness wart rather than an exposure. It should be traced and fixed before the next release.

---

## Test Results

Every number below was executed against this working tree.

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | **0 errors**, 1 pre-existing warning (`elementor-template-kit-v4/generator.mjs:106`, untouched) |
| Typecheck | `npx tsc --noEmit` | **clean** |
| Unit + integration | `npm test` | **353 passed / 35 files** (was 327 / 34) |
| New storage suite | `lib/__tests__/video-storage.test.ts` | **25 passed** |
| Production build | `npm run build` | **compiled**, 47/47 routes |
| SEO | `npm run seo:audit` | **0 ERROR, 0 WARN** |
| Dependency audit (prod) | `npm audit --omit=dev` | **0 vulnerabilities** |
| HTTP security audit | `scripts/security-audit.ts` vs. live prod server | **66/66 PASS** |
| Post-deploy smoke | `scripts/smoke.ts` vs. live prod server | **36/36 PASS** |
| Launch scenarios | `scripts/scenario-test.ts` vs. live prod server | **16/16 PASS** |
| First-deploy rehearsal | migrate → bootstrap-admin → disable-demo → `NODE_ENV=production npm start` on an **empty** PostgreSQL | **all succeeded**; `NO_OBJECT_STORAGE` correctly raised at level 50 |
| Private-prefix guard | `curl` vs. live prod server | `videos/…` → **404**, `lesson-files/…` → **404**, traversal → **400** |
| Playwright E2E | `npm run test:e2e` | **BLOCKED BY ENVIRONMENT** — `playwright install chromium` fails with `ECONNRESET` from `cdn.playwright.dev`; apt and the npm binary mirror are both unreachable from this sandbox. The suite typechecks and is wired into the `e2e` CI job. |

Nothing above is reported as passed that was not run.

---

## External Blockers

Marked `BLOCKED BY EXTERNAL CONFIGURATION` — these need real credentials or a real host, and their absence is **not** a code defect.

| Item | What is needed |
|---|---|
| **Zibal live test** | Real `ZIBAL_MERCHANT`; one small live transaction; a real callback; a real `verify`; confirmation that a replayed callback is idempotent. Wire format is pinned by 8 driver tests. |
| **MeliPayamak live test** | Real web-service `MELIPAYAMAK_USERNAME` / `MELIPAYAMAK_PASSWORD`, a sender or service number, one real OTP send. Both documented response shapes are accepted. |
| **PostgreSQL production credentials** | `DATABASE_URL` for the managed instance. If it requires TLS, set `DATABASE_SSL=true`; only add `DATABASE_SSL_REJECT_UNAUTHORIZED=false` if the provider's CA cannot be pinned. |
| **Object Storage credentials** | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` for a **private** bucket. Uploads are refused until these exist. |
| **Backup restore rehearsal** | `pg_dump` / `pg_restore` on a host that has them, then `npm run backup:verify -- --dump <file>`. No PostgreSQL client binary exists in this sandbox. |
| **Push the CI workflow** | An account with the GitHub `workflows` scope, to push `.github/workflows/ci.yml`. |
| **DNS / domain** | `NEXT_PUBLIC_APP_URL` set to the real origin, and TLS terminated at the reverse proxy. |
| **Sentry (optional)** | `SENTRY_DSN` if error tracking is wanted. |

---

## Deployment Commands

```bash
# 1 — dependencies (lockfile-exact; no --legacy-peer-deps required)
npm ci

# 2 — build
APP_SECRET="$(openssl rand -hex 32)" \
NEXT_PUBLIC_APP_URL="https://your-domain.example" \
  npm run build

# 3 — migrate (idempotent; safe on every deploy)
npm run db:migrate

# 4 — first administrator (created blocked; enrols in 2FA on first sign-in)
SUPER_ADMIN_PHONE=09120000000 \
SUPER_ADMIN_PASSWORD='a-long-unique-passphrase' \
  npm run db:bootstrap-admin

# 5 — run
npm start

# 6 — verify
curl -s "$NEXT_PUBLIC_APP_URL/api/health" | jq
```

Then read the boot log for `launch.check`. Act on `ADMIN_LOCKED_OUT`,
`NO_OBJECT_STORAGE` and `NO_ADMIN_ACCOUNT` (all `error`). `ADMIN_SEED_PASSWORD`
is a benign warning about a retired demo account that cannot sign in.

Finally: one real Zibal transaction and one real OTP SMS.

---

## Environment Checklist

**Required in production** (boot fails fast without them)

```env
APP_SECRET=                    # min 32 chars — openssl rand -hex 32
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=                 # or S3_ACCESS_KEY_ID
S3_SECRET_KEY=                 # or S3_SECRET_ACCESS_KEY
```

**Optional**

```env
ZIBAL_MERCHANT=                # payment gateway
MELIPAYAMAK_USERNAME=          # SMS panel (web-service credentials)
MELIPAYAMAK_PASSWORD=
SMS_SENDER_NUMBER=
SMS_TEMPLATE_ID=
SENTRY_DSN=
DATABASE_SSL=true              # certificate IS verified by default
S3_REGION=
S3_FORCE_PATH_STYLE=true
LOG_LEVEL=info
```

**Development / test only — never on a server**

```env
PGLITE_DIR=                    # local fallback DB; production refuses to use it
ALLOW_DEMO_SEED=               # blocked in production unless explicitly set
ALLOW_DEMO_PAYMENT=
SMOKE_BASE_URL= SECURITY_BASE_URL= SCENARIO_BASE_URL= SCENARIO_ADMIN_*= LOAD_BASE_URL=
E2E_PORT=
```

No secret in this project is exposed through a `NEXT_PUBLIC_` variable. The only
`NEXT_PUBLIC_` names are `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_ANALYTICS_ID`, `NEXT_PUBLIC_SENTRY_DSN` and
`NEXT_PUBLIC_NESHAN_MAP_KEY` — all public by design.

---

## Go/No-Go

# GO — with conditions

The application is deployable today and will run correctly behind a reverse
proxy on Node 22 with PostgreSQL and a private S3-compatible bucket. Nothing in
the codebase blocks the deploy.

**What gates the switch to real traffic:**

1. **Object Storage must be configured before the first upload.** Until it is,
   uploads are refused with `503` and the launch check reports
   `NO_OBJECT_STORAGE` at error level. This is deliberate: accepting a course
   video onto an ephemeral disk would lose it on the next deploy.
2. **One real Zibal transaction and one real MeliPayamak OTP.** The wire formats
   are pinned by tests, but no credential has ever been accepted by either
   provider. Until both succeed, treat payments and login-by-SMS as unverified.
3. **A rehearsed restore.** `npm run backup:verify` has never been run. An
   untested backup is not a backup.
4. **Playwright green once, in CI.** It has never executed in any environment.
5. **`.github/workflows/ci.yml` must be pushed** by someone with the `workflows`
   scope, or CI does not run at all.
6. **Run one replica.** The rate limiter is process-local; a second replica
   doubles every limit.

**Recommended order:** deploy to the PaaS with real `DATABASE_URL` and S3
credentials → confirm `/api/health` shows `storage: "s3"` and no error-level
launch findings → send one real OTP and take one small real payment → rehearse a
restore → open to traffic.
