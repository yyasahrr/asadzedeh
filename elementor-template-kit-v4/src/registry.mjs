/**
 * Template registry.
 *
 * Every template declares its own metadata here — the Template Map CSV, the
 * plugin dependency report, the Theme Builder condition sheet and the validator
 * are ALL generated from this single list, so documentation can never drift
 * away from what is actually emitted (spec §48, §49).
 */

export const templates = [];

/**
 * status (spec §49 — no other value is accepted):
 *   READY                        -> works after import with no action
 *   READY — NEEDS DYNAMIC BINDING-> structure is final, dynamic source must be selected
 *   READY — NEEDS REAL CONTENT   -> copy/price/date placeholders must be replaced
 *   NEEDS CUSTOM BACKEND         -> requires backend/asadzadeh-kit-*.php
 */
export function define(meta, build) {
  templates.push({
    slug: meta.slug,
    title: meta.title,
    docType: meta.docType, // Elementor document type
    group: meta.group,
    page: meta.page || '', // page/CPT it renders
    plugins: meta.plugins || [],
    dynamic: meta.dynamic || '',
    url: meta.url || '',
    condition: meta.condition || '',
    manual: meta.manual || '',
    status: meta.status || 'READY',
    build,
  });
  return meta.slug;
}

export function getTemplates() {
  return templates;
}
