#!/usr/bin/env node
/**
 * Entry point: node generator.mjs
 * Registers every template family, builds them, writes dist/.
 */
import { buildAll, writeAll } from './src/emit.mjs';

import { registerGlobal } from './src/pages/global.mjs';
import { registerPublic } from './src/pages/public.mjs';
import { registerLearn } from './src/pages/learn.mjs';
import { registerDashboard } from './src/pages/dashboard.mjs';
import { registerCommerce } from './src/pages/commerce.mjs';
import { registerAuth } from './src/pages/auth.mjs';
import { registerUtility } from './src/pages/utility.mjs';
import { registerLoops } from './src/pages/loops.mjs';

const registrars = [
  registerGlobal,
  registerPublic,
  registerLearn,
  registerDashboard,
  registerCommerce,
  registerAuth,
  registerUtility,
  registerLoops,
];

for (const register of registrars) register();

const bundle = buildAll();
const out = await writeAll(bundle);

const totalElements = bundle.docs.reduce((n, d) => n + d.stats.elements, 0);
const totalWidgets = bundle.docs.reduce((n, d) => n + d.stats.widgets, 0);
const totalResponsive = bundle.docs.reduce((n, d) => n + d.stats.responsive, 0);
const untitled = bundle.docs.reduce((n, d) => n + d.stats.untitled, 0);

console.log(
  JSON.stringify(
    {
      templates: out.count,
      elements: totalElements,
      widgets: totalWidgets,
      responsiveOverrides: totalResponsive,
      untitledElements: untitled,
      schemaGroundedOnRealExport: bundle.grounded,
      output: { direct: out.direct, kit: out.kit },
    },
    null,
    2
  )
);

if (bundle.errors.length) {
  console.error('\nBUILD ERRORS:');
  for (const e of bundle.errors) console.error(' - ' + e);
  process.exit(1);
}
