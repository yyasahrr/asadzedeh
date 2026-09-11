/**
 * Builds the physical template library.
 *
 * Two bundles are produced (spec §3):
 *   dist/direct-import/<slug>.json  -> PRIMARY. Imported one by one (or multi-select)
 *                                      via Templates > Saved Templates > Import Templates.
 *   dist/kit/                       -> SECONDARY. Website Kit shape for
 *                                      Elementor > Tools > Import/Export Kit.
 */
import { mkdir, rm, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Doc, pageRoot } from './dom.mjs';
import { DESIGN_SYSTEM_CSS } from './css.mjs';
import { getTemplates } from './registry.mjs';
import { usageReport, resetUsage, realSchemasAvailable } from './schema.mjs';
import { BRAND } from './content/site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = path.join(root, 'dist');
export const DIRECT_DIR = path.join(DIST, 'direct-import');
export const KIT_DIR = path.join(DIST, 'kit');
export const KIT_TPL_DIR = path.join(KIT_DIR, 'templates');

export const ELEMENTOR_VERSION = '3.21.0';

/** Collects everything the documentation generators need. */
export function buildAll() {
  const templates = getTemplates();
  const docs = [];
  const errors = [];
  resetUsage();

  templates.forEach((tpl, index) => {
    const doc = new Doc(tpl.slug);
    let content = [];
    try {
      const built = tpl.build(doc) || [];
      content = built.filter(Boolean);
    } catch (err) {
      errors.push(`${tpl.slug}: build failed — ${err.message}`);
      return;
    }
    if (!content.length) {
      errors.push(`${tpl.slug}: empty content`);
      return;
    }

    const rootNode = pageRoot(doc, `${tpl.slug}-root`, content, {
      title: `ریشه — ${tpl.title}`,
      cls: `az-page az-tpl-${tpl.slug}`,
      customCss: DESIGN_SYSTEM_CSS,
      bg: null,
    });

    const document = {
      title: tpl.title,
      type: tpl.docType,
      version: '0.4',
      page_settings: [], // intentionally empty: never overwrite global site settings
      content: [rootNode],
    };

    docs.push({ meta: tpl, document, stats: statsOf(document) });
  });

  return { docs, errors, usage: usageReport(), grounded: realSchemasAvailable() };
}

export function statsOf(document) {
  let elements = 0;
  let widgets = 0;
  let containers = 0;
  let responsive = 0;
  let untitled = 0;
  const shortcodes = new Set();
  const widgetTypes = new Set();

  (function walk(nodes) {
    for (const node of nodes) {
      elements++;
      if (!node.settings?._title) untitled++;
      for (const key of Object.keys(node.settings || {})) {
        if (/_tablet|_mobile|_widescreen|_laptop/.test(key)) {
          responsive++;
          break;
        }
      }
      if (node.elType === 'container') containers++;
      if (node.widgetType) {
        widgets++;
        widgetTypes.add(node.widgetType);
        const code = node.settings?.shortcode;
        if (code) shortcodes.add(code.match(/^\[([^\s\]]+)/)?.[1] || code);
      }
      walk(node.elements || []);
    }
  })(document.content || []);

  return { elements, widgets, containers, responsive, untitled, shortcodes: [...shortcodes], widgetTypes: [...widgetTypes] };
}

/* --------------------------------------------------------------- writers */

export async function writeAll(bundle) {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIRECT_DIR, { recursive: true });
  await mkdir(KIT_TPL_DIR, { recursive: true });

  const manifest = {
    name: `${BRAND.name} — Elementor Kit V5`,
    description: 'کیت کامل المنتور برای آکادمی اسدزاده: صفحات عمومی، آموزش، کلاس حضوری، فروشگاه، پنل هنرجو و وضعیت‌های خطا/خالی.',
    author: BRAND.name,
    version: '0.4',
    elementor_version: ELEMENTOR_VERSION,
    manifest_version: '2.0',
    has_site_settings: false,
    plugins: pluginManifest(bundle),
    'site-settings': {}, // deliberately empty — global settings are never overwritten
    templates: {},
  };

  for (const [index, entry] of bundle.docs.entries()) {
    const id = String(1001 + index);
    const file = path.join(DIRECT_DIR, `${entry.meta.slug}.json`);
    await writeFile(file, `${JSON.stringify(entry.document, null, 2)}\n`, 'utf8');
    await writeFile(path.join(KIT_TPL_DIR, `${id}.json`), `${JSON.stringify(entry.document, null, 2)}\n`, 'utf8');
    manifest.templates[id] = {
      title: entry.meta.title,
      doc_type: entry.meta.docType,
      slug: entry.meta.slug,
      file: `templates/${id}.json`,
    };
  }

  await writeFile(path.join(KIT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(path.join(KIT_DIR, 'site-settings.json'), `${JSON.stringify({}, null, 2)}\n`, 'utf8');

  return { count: bundle.docs.length, direct: DIRECT_DIR, kit: KIT_DIR };
}

function pluginManifest(bundle) {
  const names = new Map();
  for (const u of bundle.usage) names.set(u.plugin, (names.get(u.plugin) || 0) + u.count);
  const versions = {
    elementor: `>=${ELEMENTOR_VERSION}`,
    'elementor-pro': `>=${ELEMENTOR_VERSION}`,
    'bdthemes-element-pack-pro': 'installed',
    'premium-addons-for-elementor': 'optional',
    'learndash-lms': 'installed',
    woocommerce: 'installed',
    digits: 'installed',
    kit: 'shipped with this kit',
    'neshan-map-elementor': 'optional',
  };
  return [...names.keys()].map((plugin) => ({ plugin, version: versions[plugin] || 'installed' }));
}

export async function listDirectFiles() {
  const files = await readdir(DIRECT_DIR);
  return files.filter((f) => f.endsWith('.json')).sort();
}

export { root as KIT_ROOT };
