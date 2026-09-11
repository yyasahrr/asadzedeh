/**
 * Widget schema registry.
 *
 * PROBLEM (spec §3 / §51): hand-written Elementor settings are the #1 cause of
 * templates that import blank. So this registry does three things:
 *
 *   1. it is the single allow-list for every widgetType the kit emits,
 *   2. it records plugin attribution => docs/PLUGIN-DEPENDENCIES.md is generated
 *      from real usage, never hand-maintained,
 *   3. if `reference/schemas.json` exists (produced by `tools/analyze-export.mjs`
 *      from a REAL export of the live site), those canonical settings are merged
 *      underneath our overrides — so the kit is then grounded in the customer's
 *      actual Elementor install instead of guesses.
 *
 * Anything emitted without a verified source is reported as UNVERIFIED in
 * docs/UNRESOLVED-INTEGRATIONS.md. Nothing is silently assumed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REAL_PATH = path.join(root, 'reference', 'schemas.json');

const P = {
  CORE: 'elementor',
  PRO: 'elementor-pro',
  EP: 'bdthemes-element-pack-pro',
  PAE: 'premium-addons-for-elementor',
  LD: 'learndash-lms',
  WOO: 'woocommerce',
  DIGITS: 'digits',
  WP: 'wordpress',
};

/**
 * plugin  : owning plugin
 * verified: true only when the schema was copied from a real export or is a
 *           well-known native control set that Elementor accepts silently.
 * risk    : 'low' = missing keys simply fall back to defaults;
 *           'medium' = widget renders but may need manual re-selection;
 *           'high' = widget may not exist in the target install.
 */
export const REGISTRY = {
  /* ---------------- Elementor core ---------------- */
  heading: { plugin: P.CORE, verified: true, risk: 'low' },
  'text-editor': { plugin: P.CORE, verified: true, risk: 'low' },
  button: { plugin: P.CORE, verified: true, risk: 'low' },
  'icon-list': { plugin: P.CORE, verified: true, risk: 'low' },
  'icon-box': { plugin: P.CORE, verified: true, risk: 'low' },
  divider: { plugin: P.CORE, verified: true, risk: 'low' },
  spacer: { plugin: P.CORE, verified: true, risk: 'low' },
  accordion: { plugin: P.CORE, verified: true, risk: 'low', note: 'title_html_tag requires Elementor 3.9+' },
  tabs: { plugin: P.CORE, verified: true, risk: 'low' },
  toggle: { plugin: P.CORE, verified: true, risk: 'low' },
  image: { plugin: P.CORE, verified: true, risk: 'low' },
  'image-box': { plugin: P.CORE, verified: true, risk: 'low' },
  'image-carousel': { plugin: P.CORE, verified: true, risk: 'low' },
  gallery: { plugin: P.CORE, verified: true, risk: 'low' },
  video: { plugin: P.CORE, verified: true, risk: 'low' },
  counter: { plugin: P.CORE, verified: true, risk: 'low' },
  progress: { plugin: P.CORE, verified: true, risk: 'low' },
  alert: { plugin: P.CORE, verified: true, risk: 'low' },
  testimonial: { plugin: P.CORE, verified: true, risk: 'low' },
  'star-rating': { plugin: P.CORE, verified: true, risk: 'low' },
  html: { plugin: P.CORE, verified: true, risk: 'low' },
  shortcode: { plugin: P.CORE, verified: true, risk: 'low' },
  'search-form': { plugin: P.CORE, verified: true, risk: 'low', note: 'native search widget type is "search-form"' },
  posts: { plugin: P.CORE, verified: true, risk: 'low' },
  'menu-anchor': { plugin: P.CORE, verified: true, risk: 'low' },
  'read-more': { plugin: P.CORE, verified: true, risk: 'low' },
  template: { plugin: P.PRO, verified: true, risk: 'medium', note: 'template_id must be reselected after import' },
  form: { plugin: P.PRO, verified: true, risk: 'low', note: 'form actions (email/webhook) must be configured after import' },

  /* ---------------- Elementor Pro theme widgets ---------------- */
  'theme-post-title': { plugin: P.PRO, verified: true, risk: 'low' },
  'theme-post-content': { plugin: P.PRO, verified: true, risk: 'low' },
  'theme-post-excerpt': { plugin: P.PRO, verified: true, risk: 'low' },
  'theme-post-featured-image': { plugin: P.PRO, verified: true, risk: 'low' },
  'theme-post-terms': { plugin: P.PRO, verified: false, risk: 'medium' },
  'theme-post-navigation': { plugin: P.PRO, verified: false, risk: 'medium' },
  'theme-post-comments': { plugin: P.PRO, verified: false, risk: 'medium' },
  'theme-archive-title': { plugin: P.PRO, verified: true, risk: 'low' },
  'theme-archive-description': { plugin: P.PRO, verified: true, risk: 'low' },
  'theme-archive-posts': { plugin: P.PRO, verified: true, risk: 'low' },
  'theme-site-logo': { plugin: P.PRO, verified: true, risk: 'low' },
  'nav-menu': { plugin: P.PRO, verified: true, risk: 'medium', note: 'menu slug must be selected after import' },
  'theme-breadcrumbs': { plugin: P.PRO, verified: false, risk: 'medium' },
  'loop-grid': { plugin: P.PRO, verified: true, risk: 'medium', note: 'Loop Grid requires a Loop Item template' },
  'wc-cart': { plugin: P.PRO, verified: false, risk: 'medium', note: 'Elementor Pro WooCommerce cart widget' },

  /* ---------------- WooCommerce (Elementor Pro module) ---------------- */
  'woocommerce-product-title': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-images': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-price': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-rating': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-add-to-cart': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-meta': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-data-tabs': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-related': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-content': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-product-stock': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-breadcrumbs': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-archive-products': { plugin: P.PRO, verified: true, risk: 'medium' },
  'woocommerce-menu-cart': { plugin: P.PRO, verified: false, risk: 'medium' },
  'woocommerce-notices': { plugin: P.PRO, verified: false, risk: 'medium' },

  /* ---------------- BDThemes Element Pack Pro ---------------- */
  'bdt-advanced-heading': { plugin: P.EP, verified: false, risk: 'medium' },
  'bdt-advanced-button': { plugin: P.EP, verified: false, risk: 'medium' },
  'bdt-interactive-card': { plugin: P.EP, verified: false, risk: 'medium' },
  'bdt-dynamic-grid': { plugin: P.EP, verified: false, risk: 'medium', note: 'template_id must be reselected after import' },
  'bdt-advanced-image-gallery': { plugin: P.EP, verified: false, risk: 'medium' },
  'bdt-advanced-counter': { plugin: P.EP, verified: false, risk: 'medium' },
  'bdt-step-flow': { plugin: P.EP, verified: false, risk: 'high', note: 'oversized arrows in earlier builds — only used if controllable' },
  'bdt-accordion': { plugin: P.EP, verified: false, risk: 'medium' },
  'bdt-testimonial-slider': { plugin: P.EP, verified: false, risk: 'medium' },
  'bdt-progress-pie': { plugin: P.EP, verified: false, risk: 'medium' },
  'bdt-timeline': { plugin: P.EP, verified: false, risk: 'medium' },

  /* ---------------- third-party maps ---------------- */
  neshan_map: { plugin: 'neshan-map-elementor', verified: false, risk: 'high', note: 'widget only exists if the map plugin is installed — flagged in INSTALL' },
};

/* --------------------------------------------------------------- usage */
const usage = new Map();
export function recordUsage(type) {
  usage.set(type, (usage.get(type) || 0) + 1);
}
export function usageReport() {
  return [...usage.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count, ...(REGISTRY[type] || { plugin: 'unknown', verified: false, risk: 'high' }) }));
}
export function resetUsage() {
  usage.clear();
}

/* ------------------------------------------------------ real export sync */
let real = null;
let realLoaded = false;
export function loadRealSchemas() {
  if (realLoaded) return real;
  realLoaded = true;
  if (existsSync(REAL_PATH)) {
    try {
      real = JSON.parse(readFileSync(REAL_PATH, 'utf8'));
    } catch (err) {
      console.warn(`[schema] reference/schemas.json is not valid JSON: ${err.message}`);
      real = null;
    }
  }
  return real;
}
export function realSchemasAvailable() {
  return Boolean(loadRealSchemas()?.widgets);
}

const BANNED = new Set(['__globals__', 'custom_css', '_css_classes', 'css_classes']);

/** Strip anything that could leak global settings or ids from a real schema. */
function sanitize(settings) {
  const out = {};
  for (const [k, v] of Object.entries(settings || {})) {
    if (BANNED.has(k)) continue;
    if (k.startsWith('_element') || k.startsWith('_ob_')) continue;
    // never copy a concrete template_id: it will not exist on the target site
    if (k === 'template_id') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Merge: real-export defaults (bottom) < our authored settings (top).
 * Returns the settings object plus a marker describing provenance.
 */
export function resolveSettings(type, settings = {}) {
  const realWidgets = loadRealSchemas()?.widgets;
  const base = realWidgets?.[type] ? sanitize(realWidgets[type].settings) : null;
  if (!base) return settings;
  return { ...base, ...settings };
}

export const PLUGINS = P;
