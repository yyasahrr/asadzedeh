import { getActiveProducts, getArticles, getClasses, getCourses, getInstructors, getLearningPaths, getSeoRedirects, getSettings, initStore } from "../lib/store";

type Level = "PASS" | "WARN" | "ERROR";
const rows: { level: Level; route: string; message: string }[] = [];

function add(level: Level, route: string, message: string) {
  rows.push({ level, route, message });
}

await initStore();
const settings = getSettings();
const base = (settings.seo?.canonicalBaseUrl || settings.site.siteUrl || "").replace(/\/$/, "");
if (!base) add("ERROR", "/", "Canonical base URL is missing");
if (!settings.seo?.defaultTitle && !settings.site.siteName) add("ERROR", "/", "Missing default title");
if (!settings.seo?.defaultDescription && !settings.site.tagline) add("WARN", "/", "Missing default description");
if (!settings.seo?.defaultOgImage && !settings.site.hero?.image) add("WARN", "/", "Missing default OG image");

const titles = new Map<string, string[]>();
function noteTitle(route: string, title: string) {
  const list = titles.get(title) ?? [];
  list.push(route);
  titles.set(title, list);
}

for (const c of getCourses()) {
  const route = `/courses/${c.slug}`;
  if (!c.title) add("ERROR", route, "Missing title");
  else noteTitle(route, c.title);
  if (!c.excerpt) add("WARN", route, "Missing description");
  if (!c.image) add("WARN", route, "Missing OG image");
  if (!c.slug) add("ERROR", route, "Missing slug/canonical");
}
for (const c of getClasses()) {
  const route = `/classes/${c.slug}`;
  if (!c.title) add("ERROR", route, "Missing title");
  if (!c.excerpt) add("WARN", route, "Missing description");
}
for (const a of getArticles()) {
  const route = `/blog/${a.slug}`;
  if (!a.title) add("ERROR", route, "Missing title");
  else noteTitle(route, a.title);
  if (!a.excerpt) add("WARN", route, "Missing description");
}
for (const p of getActiveProducts()) {
  const route = `/shop/${p.slug}`;
  if (!p.title) add("ERROR", route, "Missing title");
  if (!p.excerpt) add("WARN", route, "Missing description");
  if (!p.image) add("WARN", route, "Missing OG image");
}
for (const p of getLearningPaths()) {
  if (!p.active) continue;
  if (!p.title) add("ERROR", `/paths/${p.slug}`, "Missing title");
}
for (const i of getInstructors()) {
  if (!i.name) add("WARN", `/instructors#${i.slug}`, "Missing name");
}

for (const [title, routes] of titles) {
  if (routes.length > 1) add("WARN", routes.join(", "), `Duplicate title «${title}»`);
}

const redirects = getSeoRedirects();
const froms = new Set(redirects.map((r) => r.fromPath));
for (const r of redirects) {
  if (!r.enabled) continue;
  if (r.fromPath === r.toPath) add("ERROR", r.fromPath, "Redirect points to itself");
  if (![301, 308].includes(r.statusCode)) add("ERROR", r.fromPath, "Invalid status code");
  if (froms.has(r.toPath)) add("WARN", r.fromPath, "Redirect target is also a source (possible chain)");
}

const errors = rows.filter((r) => r.level === "ERROR").length;
const warns = rows.filter((r) => r.level === "WARN").length;
for (const r of rows) {
  console.log(`${r.level.padEnd(5)}  ${r.route}  ${r.message}`);
}
if (rows.length === 0) console.log("PASS   /  no issues");
console.log(`\n${errors} ERROR, ${warns} WARN`);
process.exit(errors > 0 ? 1 : 0);
