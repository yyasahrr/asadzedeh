import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const kit = path.join(root, "dist", "kit");
const templatesPath = path.join(kit, "templates");
const allowedWidgets = new Set([
  "heading", "text-editor", "button", "shortcode", "icon-list", "search", "posts",
  "theme-post-title", "theme-post-content", "theme-post-featured-image", "theme-post-excerpt",
  "bdt-advanced-button", "bdt-advanced-heading", "bdt-interactive-card", "bdt-dynamic-grid",
  "form", "neshan_map", "woocommerce-product-images",
  "woocommerce-product-price", "woocommerce-product-add-to-cart",
  "woocommerce-product-data-tabs", "woocommerce-product-related"
]);
const allowedShortcodes = new Set([
  "ld_course_list", "ld_profile", "course_content", "learndash_course_progress",
  "products", "woocommerce_cart", "woocommerce_checkout", "woocommerce_my_account",
  "dm-page", "dm-login-page", "dm-forgot-password-page"
]);
const errors = [];
const stats = { templates:0, widgets:0, shortcodes:new Set(), widgetTypes:new Set(), externalUrls:0 };

function inspect(nodes, file, ids = new Set()) {
  for (const node of nodes) {
    if (!node.id || !node.elType) errors.push(`${file}: node without id/elType`);
    if (ids.has(node.id)) errors.push(`${file}: duplicate id ${node.id}`);
    ids.add(node.id);
    if (node.widgetType) {
      stats.widgets++;
      stats.widgetTypes.add(node.widgetType);
      if (!allowedWidgets.has(node.widgetType)) errors.push(`${file}: unsupported widget ${node.widgetType}`);
      if (typeof node.settings !== "object" || Array.isArray(node.settings)) errors.push(`${file}: invalid widget settings`);
      if (node.widgetType === "shortcode") {
        const value = node.settings.shortcode || "";
        const name = value.match(/^\[([^\s\]]+)/)?.[1];
        if (!name || !allowedShortcodes.has(name)) errors.push(`${file}: undocumented shortcode ${value}`);
        if (name) stats.shortcodes.add(name);
      }
    }
    const serialized = JSON.stringify(node.settings || {});
    if (/https?:\/\//.test(serialized)) {
      stats.externalUrls++;
      errors.push(`${file}: external URL in template`);
    }
    inspect(node.elements || [], file, ids);
  }
}

const manifest = JSON.parse(await readFile(path.join(kit, "manifest.json"), "utf8"));
if (typeof manifest["site-settings"] !== "object") errors.push("manifest: site-settings must be an object");
if (!manifest.plugins.every((plugin) => plugin.plugin && plugin.version)) errors.push("manifest: invalid plugin records");

for (const file of await readdir(templatesPath)) {
  if (!file.endsWith(".json")) continue;
  const document = JSON.parse(await readFile(path.join(templatesPath, file), "utf8"));
  stats.templates++;
  if (!Array.isArray(document.content) || document.content.length === 0) errors.push(`${file}: empty content`);
  inspect(document.content || [], file);
}

if (stats.templates !== Object.keys(manifest.templates).length) errors.push("manifest/template count mismatch");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ ...stats, shortcodes:[...stats.shortcodes].sort(), widgetTypes:[...stats.widgetTypes].sort(), status:"passed" }, null, 2));
