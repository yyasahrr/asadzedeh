#!/usr/bin/env node
/**
 * Import QA (spec §45).
 *
 *   node tools/qa-import.mjs <export-after-import.zip|folder>
 *
 * Workflow on the staging site:
 *   1. import the templates from dist/direct-import
 *   2. Elementor > Tools > Export Kit  (or export each saved template)
 *   3. run this script on that export
 *
 * It compares what came back out of WordPress against what we sent in:
 *   - did the template import at all?
 *   - is `content` still non-empty? (this is the failure that produced blank
 *     templates in previous kits)
 *   - how many elements/widgets survived?
 *   - which widgetTypes disappeared (=> plugin not installed on the target)
 *   - were shortcodes preserved?
 *
 * Writes docs/IMPORT-QA-REPORT.md.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const expectedDir = path.join(root, 'dist', 'direct-import');
const target = process.argv[2];

if (!target) {
  console.error('Usage: node tools/qa-import.mjs <export-after-import.zip|folder>');
  process.exit(1);
}

const { getTemplates } = await import('../src/registry.mjs');
const { registerGlobal } = await import('../src/pages/global.mjs');
const { registerPublic } = await import('../src/pages/public.mjs');
const { registerLearn } = await import('../src/pages/learn.mjs');
const { registerDashboard } = await import('../src/pages/dashboard.mjs');
const { registerCommerce } = await import('../src/pages/commerce.mjs');
const { registerAuth } = await import('../src/pages/auth.mjs');
const { registerUtility } = await import('../src/pages/utility.mjs');
const { registerLoops } = await import('../src/pages/loops.mjs');
for (const r of [registerGlobal, registerPublic, registerLearn, registerDashboard, registerCommerce, registerAuth, registerUtility, registerLoops]) r();
const registry = getTemplates();

/* ------------------------------------------------------------- collect */
function collectFiles(input) {
  const stat = statSync(input);
  if (stat.isDirectory()) {
    return readdirSync(input, { recursive: true })
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(input, f));
  }
  if (input.endsWith('.zip')) {
    const dir = mkdtempSync(path.join(tmpdir(), 'az-importqa-'));
    execFileSync('unzip', ['-o', '-q', input, '-d', dir]);
    return collectFiles(dir);
  }
  return [input];
}

function summarise(doc) {
  let elements = 0;
  const types = new Set();
  const shortcodes = new Set();
  (function walk(nodes) {
    for (const n of nodes || []) {
      elements++;
      if (n.widgetType) {
        types.add(n.widgetType);
        if (n.widgetType === 'shortcode' && n.settings?.shortcode) shortcodes.add(n.settings.shortcode);
      }
      walk(n.elements);
    }
  })(doc.content);
  return { elements, types, shortcodes };
}

const exported = [];
for (const file of collectFiles(target)) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  if (Array.isArray(doc.templates)) {
    for (const t of doc.templates) exported.push({ title: t.title, type: t.type, ...summarise(t) });
  } else if (doc.content) {
    exported.push({ title: doc.title, type: doc.type, ...summarise(doc) });
  }
}

/* ------------------------------------------------------------- compare */
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const byTitle = new Map(exported.map((e) => [norm(e.title), e]));

const rows = [];
for (const tpl of registry) {
  const expectedPath = path.join(expectedDir, `${tpl.slug}.json`);
  if (!existsSync(expectedPath)) continue;
  const expected = summarise(JSON.parse(readFileSync(expectedPath, 'utf8')));
  const actual = byTitle.get(norm(tpl.title));
  const issues = [];
  let status = 'PASS';

  if (!actual) {
    status = 'FAIL';
    issues.push('قالب در اکسپورت پیدا نشد — احتمالاً import نشده است');
  } else {
    if (!actual.elements) {
      status = 'FAIL';
      issues.push('content خالی است (قالب خالی import شده)');
    } else if (actual.elements < expected.elements * 0.5) {
      status = 'FAIL';
      issues.push(`تنها ${actual.elements} از ${expected.elements} المان باقی مانده`);
    }
    for (const type of expected.types) {
      if (!actual.types.has(type)) issues.push(`ویجت ${type} در خروجی نیست (افزونه نصب نیست؟)`);
    }
    for (const sc of expected.shortcodes) {
      if (!actual.shortcodes.has(sc)) issues.push(`شورتکد ${sc} حفظ نشده`);
    }
    if (issues.length && status !== 'FAIL') status = 'WARN';
    if (!issues.length) issues.push('ساختار کامل، ویجت‌ها و شورتکدها حفظ شده‌اند');
  }

  rows.push({
    slug: tpl.slug,
    title: tpl.title,
    docType: tpl.docType,
    expectedElements: expected.elements,
    actualElements: actual?.elements ?? 0,
    expectedWidgets: expected.types.size,
    actualWidgets: actual?.types.size ?? 0,
    status,
    issues,
  });
}

mkdirSync(docsDir, { recursive: true });
const pass = rows.filter((r) => r.status === 'PASS').length;
const warn = rows.filter((r) => r.status === 'WARN').length;
const fail = rows.filter((r) => r.status === 'FAIL').length;

const md = `# گزارش بررسی Import روی استیج

فایل بررسی‌شده: \`${path.basename(target)}\`
تاریخ: ${new Date().toISOString().slice(0, 19)}

خلاصه: موفق **${pass}** · هشدار **${warn}** · ناموفق **${fail}** (از ${rows.length})

> این گزارش جایگزین تست دستی نیست، اما دقیقاً همان شکست‌هایی را نشان می‌دهد که در
> کیت‌های قبلی رخ داده بود: import خالی، از دست رفتن ویجت‌ها و حذف شورتکدها.

| قالب | نوع سند | المان (انتظار/واقعی) | ویجت (انتظار/واقعی) | وضعیت | توضیح |
|---|---|---|---|---|---|
${rows
  .map(
    (r) =>
      `| ${r.slug} | ${r.docType} | ${r.expectedElements} / ${r.actualElements} | ${r.expectedWidgets} / ${r.actualWidgets} | ${r.status} | ${r.issues.join('؛ ')} |`
  )
  .join('\n')}

## گام بعدی
هر ردیف FAIL/WARN را باز کنید و علت را در \`docs/UNRESOLVED-INTEGRATIONS.md\` ثبت کنید.
`;
writeFileSync(path.join(docsDir, 'IMPORT-QA-REPORT.md'), md, 'utf8');
writeFileSync(path.join(docsDir, 'import-qa.json'), JSON.stringify({ pass, warn, fail, rows }, null, 2), 'utf8');

console.log(JSON.stringify({ pass, warn, fail, total: rows.length, report: 'docs/IMPORT-QA-REPORT.md' }, null, 2));
if (fail) process.exit(1);
