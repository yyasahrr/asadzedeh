#!/usr/bin/env node
/**
 * Builds the three delivery bundles (spec §3, §48).
 *
 *   dist/zips/asadzadeh-direct-import.zip      every template as a single JSON
 *   dist/zips/asadzadeh-website-kit.zip        manifest + templates (kit format)
 *   dist/zips/asadzadeh-all-templates.zip      flat archive of everything
 *
 * The Saved Templates importer in Elementor only accepts .json files, so the
 * direct-import ZIP is a convenience container: unzip it and multi-select the
 * files in Templates > Saved Templates > Import Templates.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const zipDir = path.join(dist, 'zips');
const directDir = path.join(dist, 'direct-import');
const kitDir = path.join(dist, 'kit');

rmSync(zipDir, { recursive: true, force: true });
mkdirSync(zipDir, { recursive: true });

const created = [];
function zip(name, cwd, paths) {
  const out = path.join(zipDir, name);
  rmSync(out, { force: true });
  execFileSync('zip', ['-r', '-q', out, ...paths], { cwd });
  created.push({ name, size: `${(statSync(out).size / 1024).toFixed(1)} KB` });
}

const directFiles = readdirSync(directDir).filter((f) => f.endsWith('.json'));
zip('asadzadeh-direct-import.zip', directDir, directFiles);
zip('asadzadeh-website-kit.zip', kitDir, ['manifest.json', 'site-settings.json', 'templates']);
zip('asadzadeh-all-templates.zip', dist, ['direct-import', 'kit', 'zips/asadzadeh-direct-import.zip', 'zips/asadzadeh-website-kit.zip']);

console.log(JSON.stringify({ created, directFiles: directFiles.length }, null, 2));
