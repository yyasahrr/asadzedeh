# Storage

Where every byte the app owns lives, and why.

```text
                    Application (PaaS, 1 replica)
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
      PostgreSQL (PaaS)                Private Object Storage
      all structured data              videos/, lesson-files/,
      sessions, orders,                uploads/
      enrolments, audit chain
```

The container filesystem is **not** a storage tier. A PaaS wipes it on every
deploy, so anything written there is lost on the next restart.

## What lives where

| Data | Store | Why |
|---|---|---|
| Users, sessions, orders, enrolments, certificates | PostgreSQL | transactional, queried, backed up |
| Audit log (tamper-evident chain) | PostgreSQL | `verifyChain()` can prove it was not edited |
| Audit log (operational stream) | stdout → platform logs | survives redeploys, ships to Loki/ELK |
| Course videos | Object Storage `videos/` | paid-for material, must outlive deploys |
| Lesson attachments | Object Storage `lesson-files/` | same |
| Site imagery, admin uploads | Object Storage `uploads/` | same |
| SEO redirects | PostgreSQL (`seo_redirects`) | editable without a rebuild |
| Multipart upload staging | object storage parts | never on local disk |

There is no `data/videos`, no `data/lesson-files` and no `data/audit.log` in
production. `data/` is a development convenience only.

## Configuring object storage

```env
S3_ENDPOINT=https://s3.example.com
S3_BUCKET=asadzedeh
S3_ACCESS_KEY=…
S3_SECRET_KEY=…
# S3_REGION=us-east-1
# S3_FORCE_PATH_STYLE=true
```

`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` are accepted as aliases — use
whichever spelling your provider's console shows.

Production refuses to boot cleanly without these: the launch check emits
`NO_OBJECT_STORAGE` at **error** level, and the video and lesson-file upload
routes answer `503` rather than storing a file they cannot keep.

## The bucket must be private

No public-read ACL, no permissive bucket policy, listing disabled.

The app never produces a public object URL. There is no object URL in the
database, in the HTML, or in any API response. Reads are proxied through routes
that authorise the caller first, so the storage endpoint is never reachable from
a browser.

| Route | Auth | Serves |
|---|---|---|
| `/api/video/[id]/token` | session + enrolment | issues a short-lived signed playback token |
| `/api/video/[id]/stream` | signed token + live session | video bytes, with `Range` support |
| `/api/lesson-files/[id]` | session + enrolment | attachment bytes |
| `/api/media/[key]` | **none** (public site imagery) | `uploads/` only |

`/api/media` is deliberately unauthenticated — it is how the public pages load
their images — which is exactly why it refuses the `videos/` and
`lesson-files/` prefixes outright. Those keys are valid; the route is what
declines them. Both answer `404`, the same as a missing object, so an
unauthorised caller cannot probe which keys exist.

### What this does and does not guarantee

Guaranteed:

- no direct public download
- no public object URL
- no unauthorised access
- no credential or access key ever sent to a browser
- a copied playback URL dies quickly (bound to video + user + user agent, with
  an expiry), and dies immediately if the session is revoked

**Not** guaranteed: a video that plays in a browser can always be captured,
because the bytes have to reach the player. No web technology changes that.
This release prevents unauthorised and direct public access; DRM and
per-student burned-in watermarking are deferred. Until then the player draws a
moving overlay with the viewer's phone number, which deters recording without
preventing it.

> Web video cannot be made absolutely impossible to capture. This release
> prevents unauthorised and direct public access; DRM is deferred.

## Uploads

Admin chooses a local video file in `/admin/videos`:

```
Admin chooses local video file
        ↓
Application multipart upload (8 MB parts)
        ↓
Private S3 bucket videos/<generated-key>
        ↓
VideoAsset object key (never a URL)
        ↓
Attach video to lesson
```

Videos upload in 8 MB chunks. Each chunk becomes one object-storage part, so a
4 GB file is never buffered in memory and never staged on local disk.

The part list is persisted on the video record (`status: "uploading"`), which
means:

- an upload interrupted by a deploy can be resumed,
- a retried chunk cannot create a duplicate billable part,
- an abandoned upload is aborted by the sweeper instead of sitting in the bucket
  forever,
- a failure mid-finalise aborts the multipart upload, leaving no orphan.

Validation:

- max size 4 GB enforced
- MIME/extension allowlist: mp4, mov, webm, mkv, m4v, avi
- uploader authorization: staff with `videos`/`courses` or linked instructor
- in production without S3 credentials: `503`, never fallback to local disk

The browser never receives a public S3 URL. Playback is always via the secure
player and signed token flow.

## Local development

Without S3 credentials the same code writes to `data/object-store/`. Identical
interface, identical authorization, and the same `/api/media` prefix guard — so
a hole in the access rules shows up in development rather than in production.

`data/object-store/` is gitignored. Nothing under it belongs in version control.
