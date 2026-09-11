#!/usr/bin/env node
/**
 * Hardened validator (spec §44).
 *
 * Differences from the legacy validator that shipped with v4:
 *   - the widget allow-list comes from src/schema.mjs (plugin-attributed),
 *     not from whatever the generator happened to emit
 *   - shortcodes must be declared in src/shortcodes.mjs
 *   - custom CSS must be scoped (every rule starts with the `selector` token)
 *   - responsive coverage, _title coverage, H1 count, RTL alignment and
 *     fake-statistic patterns are all verified
 *   - every finding is written to docs/VALIDATION-REPORT.md
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directDir = path.join(root, 'dist', 'direct-import');
const docsDir = path.join(root, 'docs');

const { REGISTRY, PLUGINS } = await import('../src/schema.mjs');
const { SHORTCODES } = await import('../src/shortcodes.mjs');
const { getTemplates } = await import('../src/registry.mjs');

// register every family so the validator compares output against the real registry
const { registerGlobal } = await import('../src/pages/global.mjs');
const { registerPublic } = await import('../src/pages/public.mjs');
const { registerLearn } = await import('../src/pages/learn.mjs');
const { registerDashboard } = await import('../src/pages/dashboard.mjs');
const { registerCommerce } = await import('../src/pages/commerce.mjs');
const { registerAuth } = await import('../src/pages/auth.mjs');
const { registerUtility } = await import('../src/pages/utility.mjs');
const { registerLoops } = await import('../src/pages/loops.mjs');
for (const register of [registerGlobal, registerPublic, registerLearn, registerDashboard, registerCommerce, registerAuth, registerUtility, registerLoops]) register();

const VALID_DOC_TYPES = new Set([
  'page', 'section', 'container', 'header', 'footer', 'single', 'archive',
  'loop-item', 'product', 'product-archive', 'error-404', 'search-results',
]);

const FAKE_STATS = [
  /\+\s?\d{3,}/, // +5000
  /\d{2,}\s?%\s?(رضایت|موفقیت)/,
  /(بیش از|تاکنون)\s?\d{3,}\s?(هنرجو|دانشجو|نفر)/,
];

const errors = [];
const warnings = [];
const rows = [];

function err(file, msg) { errors.push(`${file}: ${msg}`); }
function warn(file, msg) { warnings.push(`${file}: ${msg}`); }

/** Checks custom_css is scoped: every top-level rule must reference `selector`. */
function validateCss(file, css) {
  if (typeof css !== 'string' || !css.trim()) return;
  // strip comments
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // walk top-level blocks
  let i = 0;
  const check = (text, insideMedia) => {
    let depth = 0;
    let buf = '';
    for (let j = 0; j < text.length; j++) {
      const ch = text[j];
      if (ch === '{') {
        if (depth === 0) {
          const selectorPart = buf.trim();
          const scoped = selectorPart.includes('selector') || selectorPart.startsWith('@media') || selectorPart.startsWith('@supports');
          if (!scoped) err(file, `custom CSS rule "${selectorPart.slice(0, 60)}" is not scoped to selector`);
          buf = '';
        }
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) buf = '';
        continue;
      }
      if (depth === 0) buf += ch;
    }
  };
  // very small tolerant parser: check each `{` prelude on the same nesting level
  const preludes = [];
  let depth = 0;
  let buf = '';
  for (const ch of clean) {
    if (ch === '{') {
      if (depth === 0) preludes.push(buf.trim());
      depth++;
      buf = '';
      continue;
    }
    if (ch === '}') { depth = Math.max(0, depth - 1); buf = ''; continue; }
    if (depth === 0) buf += ch;
  }
  for (const prelude of preludes) {
    const normalized = prelude.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    if (normalized.startsWith('@media') || normalized.startsWith('@supports') || normalized.startsWith('@keyframes')) continue;
    if (!/(^|[\s,>+~])selector/.test(normalized)) {
      err(file, `custom CSS rule "${normalized.slice(0, 70)}" does not use the selector token`);
    }
  }
}

function walk(nodes, file, state) {
  for (const node of nodes) {
    state.count++;
    if (!node.id) err(file, 'element without id');
    else {
      if (state.ids.has(node.id)) err(file, `duplicate id "${node.id}"`);
      state.ids.add(node.id);
      if (!/^[a-z0-9]{4,12}$/i.test(node.id)) warn(file, `id "${node.id}" is not Elementor-like (alphanumeric)`);
    }
    if (!node.elType || !['container', 'widget', 'section', 'column'].includes(node.elType)) {
      err(file, `invalid elType "${node.elType}"`);
    }

    const s = node.settings || {};
    if (node.elType === 'widget' || node.elType === 'container') {
      if (!s._title) warn(file, `element ${node.id} has no _title`);
    }
    if (s.__globals__) err(file, 'template contains __globals__ (would overwrite global settings)');
    if (s.custom_css) validateCss(file, s.custom_css);

    // responsive coverage
    let hasResp = false;
    for (const key of Object.keys(s)) {
      if (/_(tablet|mobile|widescreen|laptop|tablet_extra|mobile_extra)$/.test(key)) hasResp = true;
      if (/_tablet$/.test(key)) state.respTablet++;
      if (/_mobile$/.test(key)) state.respMobile++;
    }
    if (hasResp) state.respElements++;

    if (node.elType === 'container' && node.elements?.length && !s.flex_direction) {
      warn(file, `container ${node.id} has children but no flex_direction`);
    }

    if (node.widgetType) {
      state.widgets++;
      state.types.add(node.widgetType);
      if (!REGISTRY[node.widgetType]) err(file, `widgetType "${node.widgetType}" is not in the schema registry`);
      else if (REGISTRY[node.widgetType].risk === 'high') warn(file, `widget "${node.widgetType}" is high risk (${REGISTRY[node.widgetType].note || 'may not exist on target'})`);

      if (node.widgetType === 'woocommerce-product-related' && !state.hasRelated) state.hasRelated = true;
    }

    if (node.widgetType === 'shortcode') {
      const code = s.shortcode || '';
      const name = code.match(/^\[([^\s\]]+)/)?.[1];
      if (!name) err(file, `unparseable shortcode "${code}"`);
      else if (!SHORTCODES[name]) err(file, `undeclared shortcode "${name}"`);
      else state.shortcodes.add(name);
    }

    if (['theme-post-title', 'woocommerce-product-title'].includes(node.widgetType) && s.header_size === 'h1') {
      state.h1.push('(dynamic post title)');
    }

    if (node.widgetType === 'heading') {
      const title = String(s.title || '');
      if (s.header_size === 'h1') state.h1.push(title);
      if (s.align && s.align !== 'right' && s.align !== 'center') warn(file, `heading "${title.slice(0, 24)}" is not RTL aligned`);
      for (const pattern of FAKE_STATS) {
        if (pattern.test(title)) err(file, `heading contains a possibly fabricated statistic: "${title.slice(0, 60)}"`);
      }
    }

    const serialized = JSON.stringify(s);
    if (/https?:\/\//.test(serialized)) {
      const matches = serialized.match(/https?:\/\/[^\s"\\]+/g) || [];
      const bad = matches.filter((m) => !m.includes('schema.org') && !m.includes('w3.org'));
      if (bad.length) err(file, `external URL(s) in template: ${bad.slice(0, 2).join(', ')}`);
    }
    if (/data:(font|application)\/[\w-]+;base64/.test(serialized) || /\.(woff2?|ttf|otf)["']?\s*\)/.test(serialized)) {
      err(file, 'font file bundled in template');
    }
    if (/(?<!REPLACE[:\s])\b(lorem ipsum|داستان تست|متن تستی)\b/i.test(serialized)) {
      warn(file, 'placeholder filler text detected');
    }

    walk(node.elements || [], file, state);
  }
}

/* ------------------------------------------------------------------ run */
await mkdir(docsDir, { recursive: true });
const files = (await readdir(directDir)).filter((f) => f.endsWith('.json')).sort();
const registrySlugs = new Set(getTemplates().map((t) => t.slug));

for (const file of files) {
  const raw = await readFile(path.join(directDir, file), 'utf8');
  const slug = file.replace(/\.json$/, '');
  const state = { count: 0, ids: new Set(), widgets: 0, types: new Set(), shortcodes: new Set(), h1: [], respElements: 0, respTablet: 0, respMobile: 0 };

  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    err(file, `JSON parse error: ${e.message}`);
    continue;
  }
  for (const key of ['title', 'type', 'version', 'page_settings', 'content']) {
    if (!(key in doc)) err(file, `missing required key "${key}"`);
  }
  if (doc.version !== '0.4') err(file, `version must be "0.4" (found "${doc.version}")`);
  if (!Array.isArray(doc.content) || doc.content.length === 0) err(file, 'content is empty — template would import blank');
  if (!VALID_DOC_TYPES.has(doc.type)) err(file, `unknown document type "${doc.type}"`);
  if (Array.isArray(doc.page_settings) && doc.page_settings.length) warn(file, 'page_settings is not empty — verify it does not overwrite site settings');
  if (!registrySlugs.has(slug)) warn(file, 'file is not in the template registry');

  walk(doc.content || [], file, state);

  // header/footer/loop items/reusable sections legitimately have no H1
  const needsH1 = !['header', 'footer', 'loop-item', 'section'].includes(doc.type);
  if (needsH1 && state.h1.length === 0) warn(file, 'no H1 found');
  if (state.h1.length > 1) err(file, `multiple H1 (${state.h1.length})`);
  if (state.respTablet === 0 || state.respMobile === 0) err(file, `insufficient responsive overrides (tablet:${state.respTablet}, mobile:${state.respMobile})`);

  rows.push({
    file,
    title: doc.title,
    type: doc.type,
    elements: state.count,
    widgets: state.widgets,
    h1: state.h1.length,
    responsive: state.respTablet + state.respMobile,
    shortcodes: [...state.shortcodes],
  });
}

/* --------------------------------------------------------------- report */
const summary = {
  templates: rows.length,
  totalElements: rows.reduce((n, r) => n + r.elements, 0),
  totalWidgets: rows.reduce((n, r) => n + r.widgets, 0),
  totalResponsiveOverrides: rows.reduce((n, r) => n + r.responsive, 0),
  errors: errors.length,
  warnings: warnings.length,
};

const md = `# گزارش اعتبارسنجی

تاریخ ساخت: ${new Date().toISOString().slice(0, 10)}
تعداد قالب‌ها: **${summary.templates}** · تعداد المان‌ها: **${summary.totalElements}** · تعداد ویجت‌ها: **${summary.totalWidgets}**
تعداد overrideهای ریسپانسیو: **${summary.totalResponsiveOverrides}**
خطاها: **${summary.errors}** · هشدارها: **${summary.warnings}**

## خطاها
${errors.length ? errors.map((e) => `- ${e}`).join('\n') : '- (ندارد)'}

## هشدارها
${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- (ندارد)'}

## جدول قالب‌ها

| فایل | عنوان | نوع سند | المان‌ها | ویجت‌ها | H1 | ریسپانسیو | شورتکدها |
|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.file} | ${r.title} | ${r.type} | ${r.elements} | ${r.widgets} | ${r.h1} | ${r.responsive} | ${r.shortcodes.join('، ') || '—'} |`).join('\n')}
`;

await writeFile(path.join(docsDir, 'VALIDATION-REPORT.md'), md, 'utf8');
await writeFile(path.join(docsDir, 'validation-report.json'), JSON.stringify({ summary, errors, warnings, rows }, null, 2), 'utf8');

console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  console.error(`\n${errors.length} ERROR(S):`);
  for (const e of errors.slice(0, 40)) console.error(' - ' + e);
  process.exit(1);
}
console.log('\nValidation passed.');
