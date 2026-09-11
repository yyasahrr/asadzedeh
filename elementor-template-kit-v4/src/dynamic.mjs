/**
 * Elementor dynamic-tag helpers (spec §32: never hardcode inherently dynamic data).
 *
 * Format emitted by Elementor exports:
 *   [elementor-tag id="a1b2c3d" name="post-title" settings="%7B%7D"]
 *
 * `settings` is URL-encoded JSON. If a tag name is not registered on the target
 * site, Elementor renders nothing for that control — which is why every helper
 * ships a literal `fallback` so a page never shows an empty gap during QA.
 *
 * Provenance: tag names are marked UNVERIFIED until a real export confirms them
 * (tools/analyze-export.mjs extracts the ones the live site actually uses).
 */

const enc = (obj) => encodeURIComponent(JSON.stringify(obj));

export function tag(seed, name, settings = {}) {
  const id = Math.abs(hash(seed + name))
    .toString(36)
    .padStart(7, 'a')
    .slice(0, 7);
  return `[elementor-tag id="${id}" name="${name}" settings="${enc(settings)}"]`;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

export const DYN = {
  postTitle: (seed) => ({ title: tag(seed, 'post-title', {}) }),
  postExcerpt: (seed, maxLength = 24) => ({ excerpt: tag(seed, 'post-excerpt', { max_length: maxLength }) }),
  postContent: (seed) => ({ content: tag(seed, 'post-content', {}) }),
  featuredImage: (seed) => ({
    image: tag(seed, 'post-featured-image', { fallback: {} }),
    link: tag(`${seed}-url`, 'post-url', {}),
  }),
  postUrl: (seed) => ({ url: tag(seed, 'post-url', {}) }),
  postDate: (seed, format = 'j F Y') => ({ date: tag(seed, 'post-date', { format }) }),
  archiveTitle: (seed) => ({ title: tag(seed, 'archive-title', {}) }),
  archiveDescription: (seed) => ({ description: tag(seed, 'archive-description', {}) }),
  /** ACF Pro field binding (spec §33). */
  acf: (seed, key, kind = 'acf-text') => ({ value: tag(seed, kind, { key }) }),
  /** Run any shortcode through a dynamic tag (needs Elementor Pro). */
  shortcode: (seed, code) => ({ value: tag(seed, 'shortcode', { shortcode: code }) }),
  siteTitle: (seed) => ({ title: tag(seed, 'site-title', {}) }),
  userInfo: (seed, type = 'display_name') => ({ value: tag(seed, 'user-info', { type }) }),
  requestParam: (seed, param = 'code') => ({ value: tag(seed, 'request-parameter', { parameter: param }) }),
  postTerms: (seed, taxonomy = 'ld_course_category') => ({ value: tag(seed, 'post-terms', { taxonomy }) }),
};

/** Convenience: dynamic title widget settings for theme templates. */
export function dynTitleSettings(seed, opts = {}) {
  return { __dynamic__: DYN.postTitle(seed), ...opts };
}

export function dynContentSettings(seed, opts = {}) {
  return { __dynamic__: DYN.postContent(seed), ...opts };
}

export function dynExcerptSettings(seed, opts = {}) {
  return { __dynamic__: DYN.postExcerpt(seed, opts.maxLength || 24), ...opts };
}

export function dynImageSettings(seed, opts = {}) {
  return { __dynamic__: DYN.featuredImage(seed), link_to: 'custom', ...opts };
}
