#!/usr/bin/env node
/**
 * Grounding step (spec §3, §51).
 *
 *   node tools/analyze-export.mjs <export.zip|folder|file.json>
 *
 * Feed it a REAL Elementor export (Elementor > Tools > Export Kit, or any
 * Saved Template JSON). It writes:
 *
 *   reference/schemas.json      canonical settings per widgetType
 *   reference/export-analysis.md human-readable findings
 *   reference/unverified.json   widgets we emit but the export cannot confirm
 *
 * Once reference/schemas.json exists, `node generator.mjs` merges those real
 * settings UNDERNEATH our authored ones, so the kit is built from the
 * customer's actual Elementor install instead of guesses.
 *
 * __globals__, custom_css and template_id are stripped from the captured
 * schemas so nothing can overwrite site-wide settings or point at a template
 * id that will not exist after import.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const refDir = path.join(root, 'reference');
const target = process.argv[2];

if (!target) {
  console.error('Usage: node tools/analyze-export.mjs <export.zip|folder|file.json>');
  process.exit(1);
}

/* ------------------------------------------------------------- collect */
function collectFiles(input) {
  const stat = statSync(input);
  if (stat.isDirectory()) {
    return readdirSync(input, { recursive: true })
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(input, f));
  }
  if (input.endsWith('.zip')) {
    const dir = mkdtempSync(path.join(tmpdir(), 'az-export-'));
    execFileSync('unzip', ['-o', '-q', input, '-d', dir]);
    return collectFiles(dir);
  }
  return [input];
}

const files = collectFiles(target);
if (!files.length) {
  console.error('No JSON files found in the provided export.');
  process.exit(1);
}

const widgets = new Map(); // type -> { settings, count, docs:Set }
const docTypes = new Map();
const dynamicTags = new Set();
const shortcodes = new Set();
const documents = [];
const skipped = [];

for (const file of files) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    skipped.push(`${path.basename(file)}: ${err.message}`);
    continue;
  }

  // a Website Kit export has templates under templates/*.json + manifest.json
  if (doc.templates || doc.manifest || doc['site-settings']) {
    if (Array.isArray(doc.templates)) {
      for (const t of doc.templates) {
        if (t.type) docTypes.set(t.type, (docTypes.get(t.type) || 0) + 1);
        if (t.content) analyse(t.content, path.basename(file));
        documents.push({ file: path.basename(file), title: t.title, type: t.type, elements: countNodes(t.content || []) });
      }
    }
    if (doc['site-settings']) {
      writeFileSync(path.join(refDir, 'site-settings.raw.json'), JSON.stringify(doc['site-settings'], null, 2));
    }
    continue;
  }

  if (!doc.content) {
    skipped.push(`${path.basename(file)}: no "content" key (not a template document)`);
    continue;
  }
  if (doc.type) docTypes.set(doc.type, (docTypes.get(doc.type) || 0) + 1);
  documents.push({ file: path.basename(file), title: doc.title, type: doc.type, elements: countNodes(doc.content || []) });
  analyse(doc.content, path.basename(file));
}

function countNodes(nodes) {
  let n = 0;
  for (const node of nodes) {
    n += 1 + countNodes(node.elements || []);
  }
  return n;
}

function analyse(nodes, file) {
  for (const node of nodes) {
    if (node.widgetType) {
      const existing = widgets.get(node.widgetType) || { settings: null, count: 0, docs: new Set() };
      existing.count++;
      existing.docs.add(file);
      if (!existing.settings) existing.settings = sanitize(node.settings || {});
      widgets.set(node.widgetType, existing);

      if (node.widgetType === 'shortcode' && node.settings?.shortcode) {
        const name = String(node.settings.shortcode).match(/^\[([^\s\]]+)/)?.[1];
        if (name) shortcodes.add(name);
      }
    }
    for (const value of Object.values(node.settings || {})) {
      const text = typeof value === 'string' ? value : Array.isArray(value) ? JSON.stringify(value) : null;
      if (!text) continue;
      for (const m of text.matchAll(/\[elementor-tag [^\]]*name="([^"]+)"/g)) dynamicTags.add(m[1]);
    }
    analyse(node.elements || [], file);
  }
}

const BANNED = ['__globals__', 'custom_css', '_css_classes', 'css_classes', 'template_id'];
function sanitize(settings) {
  const out = {};
  for (const [k, v] of Object.entries(settings)) {
    if (BANNED.includes(k)) continue;
    if (k.startsWith('_element') || k.startsWith('_ob_')) continue;
    if (k === 'shortcode' || k === 'editor' || k === 'title' || (k.startsWith('tab_') && typeof v === 'string')) continue; // content, not schema
    if (k.endsWith('_list') && Array.isArray(v)) continue; // repeaters hold content
    out[k] = v;
  }
  return out;
}

/* -------------------------------------------------------------- compare */
const { REGISTRY } = await import('../src/schema.mjs');
const { SHORTCODES } = await import('../src/shortcodes.mjs');

const usedByKit = new Set(Object.keys(REGISTRY));
const confirmed = [];
const missing = [];
for (const type of usedByKit) {
  if (widgets.has(type)) confirmed.push(type);
  else missing.push(type);
}
const opportunities = [...widgets.keys()].filter((w) => !usedByKit.has(w));

const unknownShortcodes = [...shortcodes].filter((s) => !SHORTCODES[s]);

/* ---------------------------------------------------------------- write */
mkdirSync(refDir, { recursive: true });
const schemas = {
  generatedAt: new Date().toISOString(),
  source: path.basename(target),
  documentCount: documents.length,
  widgets: Object.fromEntries(
    [...widgets.entries()].map(([type, v]) => [type, { settings: v.settings, count: v.count, files: [...v.docs] }])
  ),
};
writeFileSync(path.join(refDir, 'schemas.json'), JSON.stringify(schemas, null, 2), 'utf8');

const md = `# تحلیل اکسپورت واقعی المنتور

منبع: \`${path.basename(target)}\`
تاریخ تحلیل: ${new Date().toISOString().slice(0, 19)}
تعداد سندها: **${documents.length}** · تعداد نوع ویجت: **${widgets.size}**

## انواع سند موجود در اکسپورت
${[...docTypes.entries()].map(([t, c]) => `- \`${t}\` — ${c}`).join('\n') || '- (یافت نشد)'}

## ویجت‌های موجود در نصب واقعی
| نوع ویجت | تعداد استفاده | وضعیت در کیت |
|---|---|---|
${[...widgets.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .map(([type, v]) => `| \`${type}\` | ${v.count} | ${usedByKit.has(type) ? 'استفاده شده ✅' : 'استفاده نشده'} |`)
  .join('\n')}

## ویجت‌هایی که کیت استفاده می‌کند اما در این اکسپورت دیده نشد
${missing.length ? missing.map((t) => `- \`${t}\` — ${REGISTRY[t]?.plugin || '؟'} (${REGISTRY[t]?.note || 'بدون توضیح'})`).join('\n') : '- (همه تأیید شدند)'}

> نبود یک ویجت در اکسپورت لزوماً به معنای نصب‌نبودن آن نیست؛ ممکن است در هیچ قالبی استفاده نشده باشد. این موارد در \`reference/unverified.json\` ثبت می‌شوند تا پیش از انتشار بررسی شوند.

## تگ‌های داینامیک استفاده‌شده در سایت
${[...dynamicTags].map((t) => `- \`${t}\``).join('\n') || '- (یافت نشد)'}

## شورتکدهای استفاده‌شده در سایت
${[...shortcodes].map((s) => `- \`${s}\`${SHORTCODES[s] ? '' : ' — در رجیستری کیت تعریف نشده'}`).join('\n') || '- (یافت نشد)'}

## فایل‌های نادیده گرفته‌شده
${skipped.map((s) => `- ${s}`).join('\n') || '- (ندارد)'}
`;
writeFileSync(path.join(refDir, 'export-analysis.md'), md, 'utf8');
writeFileSync(
  path.join(refDir, 'unverified.json'),
  JSON.stringify({ generatedAt: schemas.generatedAt, missingWidgetTypes: missing, unknownShortcodes, opportunities }, null, 2),
  'utf8'
);

console.log(
  JSON.stringify(
    {
      documents: documents.length,
      widgetTypes: widgets.size,
      confirmed: confirmed.length,
      missing,
      opportunities,
      dynamicTags: [...dynamicTags],
      shortcodes: [...shortcodes],
      unknownShortcodes,
      skipped,
      written: ['reference/schemas.json', 'reference/export-analysis.md', 'reference/unverified.json'],
    },
    null,
    2
  )
);
