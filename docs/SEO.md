# SEO

Admin: `/admin/seo` (defaults + per-entity overrides) and `/admin/seo/redirects` (301/308 with loop detection).

Public:

- `app/robots.ts` / `app/sitemap.ts`
- JSON-LD Organization + WebSite on every page, Course + FAQ + breadcrumb on course pages
- Canonical / Open Graph via `lib/seo`
- Private areas send `noindex` (`middleware.ts` + layout metadata)

Redirects persist to Postgres and `data/seo-redirects.json` so `server.mjs` can apply them before Next.

CLI: `npm run seo:audit` — exits 1 on ERROR (missing titles, self-loops).
