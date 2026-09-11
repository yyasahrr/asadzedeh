#!/usr/bin/env node
/**
 * Generates every deliverable document (spec §48 items 5–15) from the template
 * registry + build output, so documentation cannot drift from what is shipped.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const directDir = path.join(root, 'dist', 'direct-import');

const { getTemplates } = await import('../src/registry.mjs');
const { usageReport, resetUsage, REGISTRY, realSchemasAvailable } = await import('../src/schema.mjs');
const { SHORTCODES } = await import('../src/shortcodes.mjs');
const { DESIGN_SYSTEM_CSS } = await import('../src/css.mjs');
const { C, FONT, LAYOUT } = await import('../src/tokens.mjs');

const { registerGlobal } = await import('../src/pages/global.mjs');
const { registerPublic } = await import('../src/pages/public.mjs');
const { registerLearn } = await import('../src/pages/learn.mjs');
const { registerDashboard } = await import('../src/pages/dashboard.mjs');
const { registerCommerce } = await import('../src/pages/commerce.mjs');
const { registerAuth } = await import('../src/pages/auth.mjs');
const { registerUtility } = await import('../src/pages/utility.mjs');
const { registerLoops } = await import('../src/pages/loops.mjs');
for (const r of [registerGlobal, registerPublic, registerLearn, registerDashboard, registerCommerce, registerAuth, registerUtility, registerLoops]) r();

const templates = getTemplates();
mkdirSync(docsDir, { recursive: true });

/* ------------------------------------------------------------ stats pass */
resetUsage();
const statsBySlug = new Map();
for (const file of readdirSync(directDir).filter((f) => f.endsWith('.json'))) {
  const doc = JSON.parse(readFileSync(path.join(directDir, file), 'utf8'));
  let elements = 0;
  let widgets = 0;
  let responsive = 0;
  const shortcodes = new Set();
  (function walk(nodes) {
    for (const n of nodes || []) {
      elements++;
      for (const k of Object.keys(n.settings || {})) {
        if (/_(tablet|mobile)$/.test(k)) responsive++;
      }
      if (n.widgetType) {
        widgets++;
        if (n.widgetType === 'shortcode' && n.settings?.shortcode) {
          shortcodes.add(String(n.settings.shortcode).match(/^\[([^\s\]]+)/)?.[1]);
        }
      }
      walk(n.elements || []);
    }
  })(doc.content || []);
  statsBySlug.set(file.replace(/\.json$/, ''), {
    elements,
    widgets,
    responsive,
    shortcodes: [...shortcodes].filter(Boolean),
    title: doc.title,
    type: doc.type,
  });
}
const usage = usageReport();

/* ======================================================= TEMPLATE MAP CSV */
const csvEscape = (v) => {
  const s = String(v ?? '').replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
};
const csvRows = [
  ['filename', 'template_title', 'template_type', 'page_or_cpt', 'required_plugin', 'dynamic_source', 'recommended_url', 'theme_builder_condition', 'manual_steps', 'status', 'elements', 'widgets', 'responsive_overrides', 'shortcodes'],
  ...templates.map((t) => {
    const s = statsBySlug.get(t.slug) || {};
    return [
      `${t.slug}.json`,
      t.title,
      t.docType,
      t.page,
      t.plugins.join(' + '),
      t.dynamic,
      t.url,
      t.condition,
      t.manual,
      t.status,
      s.elements ?? 0,
      s.widgets ?? 0,
      s.responsive ?? 0,
      (s.shortcodes || []).join(' '),
    ];
  }),
];
writeFileSync(path.join(docsDir, 'TEMPLATE-MAP.csv'), '﻿' + csvRows.map((r) => r.map(csvEscape).join(',')).join('\n') + '\n', 'utf8');

/* ==================================================== README-FA.md */
const statusLegend = `
| وضعیت | معنا |
|---|---|
| READY | پس از Import بدون اقدام اضافی کار می‌کند |
| READY — NEEDS DYNAMIC BINDING | ساختار نهایی است؛ منبع داینامیک باید در ویرایشگر انتخاب شود |
| READY — NEEDS REAL CONTENT | متن/قیمت/تاریخ‌ها باید با مقادیر واقعی جایگزین شود |
| NEEDS CUSTOM BACKEND | نیازمند فایل‌های \`backend/\` این کیت است |
`;

const readmeFa = `# کیت المنتور آکادمی اسدزاده — V5

این کیت یک پیاده‌سازی کامل وردپرس/المنتور برای آکادمی اسدزاده است: صفحات عمومی،
نظام آموزش آنلاین (LearnDash)، کلاس‌های حضوری، فروشگاه (WooCommerce)،
ورود با رمز یک‌بارمصرف (Digits)، پنل هنرجو، گواهی‌ها و وضعیت‌های خطا/خالی.

تعداد قالب‌ها: **${templates.length}**
تعداد المان‌ها: **${[...statsBySlug.values()].reduce((n, s) => n + s.elements, 0)}**
تعداد ویجت‌ها: **${[...statsBySlug.values()].reduce((n, s) => n + s.widgets, 0)}**
تعداد overrideهای ریسپانسیو: **${[...statsBySlug.values()].reduce((n, s) => n + s.responsive, 0)}**

## چرا از نسخهٔ قبلی متفاوت است

کیت قبلی از نظر تعداد قالب کامل به‌نظر می‌رسید اما در عمل چند نقص اساسی داشت:
صفحهٔ تک‌دوره فقط ۱۱ المان داشت (یک Shortcode shell)، ۲۰۱۸ المان عنوانِ معنادار
نداشتند، در کل ۵۶ قالب تنها ۴ المان override ریسپانسیو داشتند، هیچ CSS سفارشی
در کار نبود و المنت‌پک بیشتر تزئینی استفاده شده بود. این نسخه با یک مولّد
جدید ساخته شده که نام‌گذاری، ریسپانسیو، کلاس‌بندی و CSSِ محدود‌شده را روی
**همهٔ** المان‌ها به‌طور خودکار اعمال می‌کند، و یک ولیدیتور سخت‌گیرانه دارد که
خروجی را پیش از تحویل بررسی می‌کند.

## پیش‌نیازها

- Elementor و Elementor Pro
- BDThemes Element Pack Pro (برای Dynamic Grid و Advanced Button/Heading)
- LearnDash LMS (دوره، درس، موضوع، آزمون)
- WooCommerce و Persian WooCommerce
- Digits (ورود با رمز یک‌بارمصرف)
- ACF Pro (فیلدهای مسیر یادگیری، مدرس و آثار)
- برای قالب‌های دارای وضعیت NEEDS CUSTOM BACKEND: نصب فایل‌های \`backend/\`

## ترتیب نصب

۱. از فایل‌ها پشتیبان بگیرید و ابتدا روی یک سایت استیج امتحان کنید.
۲. افزونه‌های بالا را فعال کنید.
۳. دو فونت \`Neirizi\` و \`Peyda\` را در Elementor › Custom Fonts با همین نام ثبت کنید
   (هیچ فایل فونتی در این کیت بسته‌بندی نشده است).
۴. فایل‌های \`backend/\` را به‌صورت افزونه یا در \`wp-content/mu-plugins/\` قرار دهید و فعال کنید.
۵. قالب‌های \`dist/direct-import\` را یکی‌یکی یا با انتخاب چندتایی از مسیر
   **Templates › Saved Templates › Import Templates** وارد کنید.
   (فایل ZIP فقط برای راحتی جابه‌جایی است؛ خودِ ZIP را در همین مسیر import نکنید.)
۶. قالب‌های Theme Builder (سربرگ، پابرگ، Singleها، Loop Itemها) را طبق
   \`THEME-BUILDER-CONDITIONS.md\` به شرط نمایش وصل کنید.
7. مراحل دستی هر قالب را از \`MANUAL-STEPS.md\` انجام دهید.

## وضعیت‌ها
${statusLegend}
## فهرست قالب‌ها

| فایل | عنوان | نوع | المان‌ها | وضعیت |
|---|---|---|---|---|
${templates
  .map((t) => {
    const s = statsBySlug.get(t.slug) || {};
    return `| ${t.slug}.json | ${t.title} | ${t.docType} | ${s.elements ?? 0} | ${t.status} |`;
  })
  .join('\n')}

## فایل‌های مهم

- \`dist/direct-import/\` — قالب‌های آمادهٔ Import (روش اصلی)
- \`dist/kit/\` — بستهٔ Website Kit برای Elementor › Tools › Import/Export Kit
- \`dist/zips/\` — سه بستهٔ ZIP برای جابه‌جایی
- \`docs/TEMPLATE-MAP.csv\` — نقشهٔ کامل قالب‌ها
- \`docs/VALIDATION-REPORT.md\` — گزارش اعتبارسنجی
- \`docs/UNRESOLVED-INTEGRATIONS.md\` — مواردی که باید پیش از انتشار حل شوند
- \`docs/RESPONSIVE-QA.md\` — چک‌لیست بررسی واکنش‌گرایی
- \`backend/\` — کد PHP مورد نیاز شورتکدها، CPTها و فیلدهای ACF

## بازسازی خروجی

\`\`\`bash
node generator.mjs         # ساخت خروجی
node tools/validate.mjs    # اعتبارسنجی
node tools/build-docs.mjs  # تولید مستندات
node tools/build-zip.mjs   # ساخت بسته‌های ZIP
node tools/analyze-export.mjs <export.zip>   # اتصال به اکسپورت واقعی سایت
node tools/qa-import.mjs <export-after-import.zip>  # بررسی import روی استیج
\`\`\`
`;
writeFileSync(path.join(docsDir, 'README-FA.md'), readmeFa, 'utf8');

/* =============================================== PLUGIN-DEPENDENCIES.md */
const byPlugin = new Map();
for (const u of usage) {
  const list = byPlugin.get(u.plugin) || [];
  list.push(u);
  byPlugin.set(u.plugin, list);
}
const pluginDeps = `# گزارش وابستگی به افزونه‌ها

این جدول از روی **ویجت‌های واقعاً استفاده‌شده** در خروجی تولید شده است، نه از یک فهرست دستی.

| افزونه | تعداد استفاده | ویجت‌ها |
|---|---|---|
${[...byPlugin.entries()]
  .sort((a, b) => b[1].reduce((n, u) => n + u.count, 0) - a[1].reduce((n, u) => n + u.count, 0))
  .map(([plugin, list]) => `| \`${plugin}\` | ${list.reduce((n, u) => n + u.count, 0)} | ${list.map((u) => `\`${u.type}\``).join('، ')} |`)
  .join('\n')}

## جزئیات ریسک هر ویجت

| ویجت | افزونه | تأییدشده | ریسک | توضیح |
|---|---|---|---|---|
${usage.map((u) => `| \`${u.type}\` | ${u.plugin} | ${u.verified ? 'بله' : 'خیر'} | ${u.risk} | ${u.note || '—'} |`).join('\n')}

## قالب‌هایی که بدون افزونهٔ خاص کار نمی‌کنند

${[...new Set(templates.flatMap((t) => (t.status === 'NEEDS CUSTOM BACKEND' ? [t.plugins.join(' + ')] : [])))]
  .map((p) => `- ${p}`)
  .join('\n') || '- (موردی وجود ندارد)'}
`;
writeFileSync(path.join(docsDir, 'PLUGIN-DEPENDENCIES.md'), pluginDeps, 'utf8');

/* ==================================================== SHORTCODE-MAP.md */
const usedShortcodes = new Set([...statsBySlug.values()].flatMap((s) => s.shortcodes || []));
const shortcodeMap = `# نقشهٔ شورتکدها

هر شورتکدی که در خروجی استفاده شده باید اینجا تعریف شده باشد؛ در غیر این صورت
ولیدیتور خطا می‌دهد (الزام مادهٔ ۲۴: اختراع شورتکد بدون بررسی ممنوع).

| شورتکد | منبع | تأییدشده | هدف | پارامترها | استفاده در |
|---|---|---|---|---|---|
${Object.entries(SHORTCODES)
  .filter(([name]) => usedShortcodes.has(name))
  .map(([name, meta]) => {
    const files = templates.filter((t) => (statsBySlug.get(t.slug)?.shortcodes || []).includes(name)).map((t) => t.slug);
    return `| \`[${name}]\` | ${meta.source === 'kit-php' ? 'backend/ این کیت' : meta.plugin} | ${meta.verified ? 'بله' : 'خیر — باید روی سایت بررسی شود'} | ${meta.purpose} | ${meta.params || '—'} | ${files.join('، ')} |`;
  })
  .join('\n')}

## شورتکدهای تعریف‌شده اما استفاده‌نشده

${Object.keys(SHORTCODES)
  .filter((n) => !usedShortcodes.has(n))
  .map((n) => `- \`[${n}]\` — ${SHORTCODES[n].purpose}`)
  .join('\n') || '- (ندارد)'}
`;
writeFileSync(path.join(docsDir, 'SHORTCODE-MAP.md'), shortcodeMap, 'utf8');

/* ================================================ DYNAMIC-FIELD-MAP.md */
const dynamicMap = `# نقشهٔ فیلدهای داینامیک (مادهٔ ۳۲ و ۳۳)

## آنچه در قالب‌ها داینامیک است

| قالب | منبع داینامیک | نحوهٔ اتصال |
|---|---|---|
${templates
  .filter((t) => t.dynamic)
  .map((t) => `| ${t.slug}.json | ${t.dynamic} | ${t.manual || 'پس از Import بررسی شود'} |`)
  .join('\n')}

## فیلدهای ACF پیشنهادی

### CPT \`learning_path\` — مسیر یادگیری
| فیلد | نوع | توضیح |
|---|---|---|
| \`description\` | Textarea | معرفی مسیر |
| \`accent\` | Select | navy / red / teal / cream |
| \`duration\` | Text | مدت کل |
| \`path_courses\` | Relationship (چندتایی) | توالی دوره‌ها — حتماً چندتایی باشد |
| \`fixed_price\` | Number | قیمت بسته |
| \`discount\` | Number | تخفیف واقعی (در صورت وجود) |
| \`steps\` | Repeater | مراحل |
| \`outcomes\` | Repeater | خروجی‌ها |
| \`faq\` | Repeater | پرسش‌ها |

### CPT \`instructor\` — مدرس
| فیلد | نوع | توضیح |
|---|---|---|
| \`specialty\` | Text | تخصص |
| \`experience\` | Text | تجربه (فقط در صورت تأیید) |
| \`biography\` | WYSIWYG | بیوگرافی |
| \`profile_image\` | Image | تصویر |
| \`social_links\` | Repeater | شبکه‌ها |
| \`featured_courses\` | Relationship | دوره‌های شاخص |

### CPT \`az_artwork\` — اثر
| فیلد | نوع | توضیح |
|---|---|---|
| \`technique\` | Text | تکنیک |
| \`materials\` | Text | مواد |
| \`dimensions\` | Text | ابعاد |
| \`artist\` | Text | هنرمند/هنرجو |
| \`year\` | Text | سال |
| \`gallery\` | Gallery | تصاویر |

## Shortcodeهای سفارشی که دادهٔ واقعی می‌خوانند

| شورتکد | دادهٔ واقعی | در صورت نبود داده |
|---|---|---|
| \`[az_course_meta]\` | سطح، مدت، جلسات، قیمت، مدرس، پیش‌نیاز | متن جایگزین نمایش داده می‌شود |
| \`[az_course_cta]\` | وضعیت ثبت‌نام کاربر در LearnDash | دکمهٔ خرید |
| \`[az_course_curriculum]\` | سرفصل واقعی با وضعیت قفل/رایگان/تکمیل | فهرست خالی |
| \`[az_dashboard_stats]\` | شمارش‌های واقعی از LearnDash/Woo | **هیچ عدد ساختگی نشان نمی‌دهد** |
| \`[az_continue_learning]\` | آخرین درس باز شده | وضعیت خالی |
| \`[az_my_courses]\` | دوره‌ها با درصد پیشرفت | وضعیت خالی |
| \`[az_my_workshops]\` | کلاس‌های خریداری‌شده | وضعیت خالی |
| \`[az_assignments]\` | تکالیف و وضعیت بررسی | وضعیت خالی |
| \`[az_my_certificates]\` / \`[az_certificate_detail]\` | گواهی‌های واقعی | وضعیت خالی |
| \`[az_workshop_meta]\` | موجودی محصول = ظرفیت، تاریخ، جلسات | متن جایگزین |
| \`[az_path_courses]\` | توالی دوره‌های مسیر | فهرست ثابت |
| \`[az_related_courses]\` | دوره‌های هم‌دسته | فهرست ثابت |
| \`[az_my_orders]\` / \`[az_order_detail]\` | سفارش‌های ووکامرس با بررسی مالکیت | وضعیت خالی |
| \`[az_certificate_verify]\` | استعلام عمومی با nonce | پیام «پیدا نشد» |
| \`[az_order_tracking]\` | پیگیری سفارش با nonce | پیام خطا |
| \`[az_preorder_form]\` | لیست انتظار | فرم جایگزین المنتور |
| \`[az_profile_form]\` | ویرایش پروفایل با nonce | فرم جایگزین المنتور |

## تگ‌های داینامیک المنتور

در Loop Itemها و قالب‌های Single از تگ‌های نیتیو استفاده شده است:
\`post-title\`، \`post-excerpt\`، \`post-content\`، \`post-featured-image\`، \`post-url\`.
هیچ مقداری در JSON هاردکد نشده است.
`;
writeFileSync(path.join(docsDir, 'DYNAMIC-FIELD-MAP.md'), dynamicMap, 'utf8');

/* ============================================ THEME-BUILDER-CONDITIONS */
const tb = `# شرایط نمایش Theme Builder

نوع سند هر قالب یک **نوع واقعی المنتور** است؛ شرط نمایش پس از Import باید
طبق این جدول تنظیم شود.

| قالب | نوع سند | شرط نمایش |
|---|---|---|
${templates
  .filter((t) => t.condition)
  .map((t) => `| ${t.slug}.json | \`${t.docType}\` | ${t.condition} |`)
  .join('\n')}

## قالب‌هایی که شرط ندارند (صفحات عادی)

${templates
  .filter((t) => !t.condition)
  .map((t) => `- ${t.slug}.json — ${t.title} (${t.url || t.page})`)
  .join('\n')}

## نکات مهم

- سربرگ و پابرگ روی **Entire Site** تنظیم شوند.
- قالب \`class-single\` (کلاس حضوری) باید **اولویت بالاتری** از \`single-product\`
  داشته باشد و روی دستهٔ \`workshop\` شرط بخورد.
- Loop Itemها فقط زمانی دیده می‌شوند که در یک Loop Grid یا Dynamic Grid انتخاب شوند.
- برای دوره‌ها، درس‌ها، موضوع‌ها و آزمون‌ها از نوع سند \`single\` با شرط
  **Singular › Courses/Lessons/Topics/Quizzes** استفاده کنید (نه نوع سند اختصاصی).
- صفحاتی که نیازمند محدودیت دسترسی هستند (پنل هنرجو) را با افزونهٔ محدودسازی
  یا کد سفارشی محدود کنید؛ المنتور به‌تنهایی دسترسی را کنترل نمی‌کند.
`;
writeFileSync(path.join(docsDir, 'THEME-BUILDER-CONDITIONS.md'), tb, 'utf8');

/* ==================================================== MANUAL-STEPS.md */
const manual = `# گام‌های دستی پس از Import

| قالب | کار لازم |
|---|---|
${templates.filter((t) => t.manual).map((t) => `| ${t.slug}.json | ${t.manual} |`).join('\n')}

## گام‌های عمومی

1. ثبت دو فونت \`Neirizi\` و \`Peyda\` در Elementor › Custom Fonts (بدون بسته‌بندی فونت).
2. انتخاب منوی اصلی در ویجت Nav Menu قالب سربرگ.
3. تنظیم Action After Submit فرم تماس (ایمیل/وب‌هوک) و جایگزینی ایمیل پیش‌فرض.
4. جایگزینی همهٔ مقادیر \`REPLACE:\` با دادهٔ واقعی (تلفن، نشانی، قیمت، تاریخ کلاس‌ها، نام مدرسان).
5. انتخاب Loop Item مربوط در Dynamic Gridهای آثار و مدرسان.
6. تنظیم شرایط نمایش طبق \`THEME-BUILDER-CONDITIONS.md\`.
7. اتصال صفحات پرداخت موفق/ناموفق به Thank You page ووکامرس.
8. محدود کردن دسترسی صفحات پنل هنرجو به کاربران واردشده.
9. بررسی RTL و ریسپانسیو طبق \`RESPONSIVE-QA.md\`.
10. بازبینی حقوقی متن‌های \`privacy\`، \`terms\`، \`rules\`، \`refund\` و \`shipping\`
    پیش از انتشار (این متن‌ها پیش‌نویس هستند).
`;
writeFileSync(path.join(docsDir, 'MANUAL-STEPS.md'), manual, 'utf8');

/* =========================================== UNRESOLVED-INTEGRATIONS.md */
const unverifiedWidgets = usage.filter((u) => !u.verified);
const unverifiedShortcodes = Object.entries(SHORTCODES).filter(([n, m]) => usedShortcodes.has(n) && !m.verified);
const backendTemplates = templates.filter((t) => t.status === 'NEEDS CUSTOM BACKEND');
const realContentTemplates = templates.filter((t) => t.status === 'READY — NEEDS REAL CONTENT');

const unresolved = `# موارد حل‌نشده و نیازمند تصمیم

این فایل تعمداً صریح است: هرچه اینجا آمده هنوز **تأیید نشده** و نباید
«انجام‌شده» فرض شود.

## ۱. عدم اتکا به اکسپورت واقعی

${
  realSchemasAvailable()
    ? '✅ خروجی روی یک اکسپورت واقعی از سایت شما سوار شده است (`reference/schemas.json` موجود است).'
    : `❌ هنوز هیچ اکسپورت واقعی از وردپرس/المنتور تحلیل نشده است. تنظیمات ویجت‌ها
محافظه‌کارانه و بر اساس کنترل‌های شناخته‌شدهٔ المنتور است، اما **تست import واقعی
انجام نشده**. برای رفع این مورد:

\`\`\`bash
node tools/analyze-export.mjs <export.zip>
node generator.mjs
\`\`\`

سپس روی استیج import کنید و خروجی را با \`tools/qa-import.mjs\` بررسی کنید.`
}

## ۲. ویجت‌های استفاده‌شده که schema آن‌ها تأیید نشده

| ویجت | افزونه | ریسک | توضیح |
|---|---|---|---|
${unverifiedWidgets.map((u) => `| \`${u.type}\` | ${u.plugin} | ${u.risk} | ${u.note || 'نیازمند تأیید روی نصب واقعی'} |`).join('\n') || '- (همه تأیید شده‌اند)'}

## ۳. شورتکدهایی که باید روی سایت بررسی شوند

| شورتکد | افزونه | هدف |
|---|---|---|
${unverifiedShortcodes.map(([n, m]) => `| \`[${n}]\` | ${m.plugin} | ${m.purpose} |`).join('\n') || '- (ندارد)'}

${
  unverifiedShortcodes.some(([n]) => n.startsWith('dm-'))
    ? `> دربارهٔ Digits: اگر نسخهٔ نصب‌شده شورتکد متفاوتی ارائه می‌دهد یا مرحلهٔ OTP را
> داخل همان فرم مدیریت می‌کند، شورتکد را جایگزین کنید و قالب \`otp\` را به جریان
> اصلی متصل نکنید (مادهٔ ۲۴).`
    : ''
}

## ۴. قالب‌های نیازمند بک‌اند سفارشی

این قالب‌ها بدون فایل‌های \`backend/\` کار نمی‌کنند:

${backendTemplates.map((t) => `- **${t.slug}.json** — ${t.title}: ${t.dynamic}`).join('\n')}

## ۵. قالب‌های نیازمند محتوای واقعی

${realContentTemplates.length} قالب دارای متغیرهای \`REPLACE:\` هستند (تلفن، نشانی،
قیمت، تاریخ، نام مدرسان). این مقادیر **عمداً** ساختگی نیستند.

## ۶. محدودیت‌های محیط توسعه

- دسترسی به \`asadzadehacademy.ir\` از محیط ساخت مسدود است؛ بنابراین
  **تست import واقعی (مادهٔ ۴۵) انجام نشده** و باید روی استیج انجام شود.
- نصب محلی وردپرس با Elementor Pro در این محیط ممکن نیست (نیازمند لایسنس).
- ریسپانسیو با overrideهای نیتیو و CSS بررسی شده، اما **تست بصری روی دستگاه واقعی**
  هنوز انجام نشده است؛ چک‌لیست در \`RESPONSIVE-QA.md\`.
- آمارها عمداً ساختگی نیستند: \`[az_dashboard_stats]\` در صورت نبود داده، مقدار
  صفر یا وضعیت خالی نشان می‌دهد و هرگز عدد تزیینی چاپ نمی‌کند.
`;
writeFileSync(path.join(docsDir, 'UNRESOLVED-INTEGRATIONS.md'), unresolved, 'utf8');

/* ==================================================== RESPONSIVE-QA.md */
const responsiveQa = `# چک‌لیست بررسی واکنش‌گرایی (مادهٔ ۱۰ و ۴۶)

## پوشش خودکار در خروجی

| شاخص | مقدار |
|---|---|
| تعداد overrideهای ریسپانسیو | ${[...statsBySlug.values()].reduce((n, s) => n + s.responsive, 0)} |
| میانگین override در هر قالب | ${( [...statsBySlug.values()].reduce((n, s) => n + s.responsive, 0) / Math.max(1, statsBySlug.size) ).toFixed(1)} |
| قالب‌های بدون override موبایل | ${[...statsBySlug.values()].filter((s) => s.responsive === 0).length} |

Breakpointهای اعمال‌شده: ۱۰۲۴، ۸۶۰، ۷۶۷، ۴۲۰، ۳۶۰ پیکسل.

## قوانین اعمال‌شده در CSS

- زیر ۷۶۷px همهٔ گریدها تک‌ستونه و دکمه‌ها تمام‌عرض می‌شوند.
- ورودی‌های فرم حداقل ۱۶px تا زوم مرورگر در iOS رخ ندهد.
- ستون خرید و ستون‌های کناری از حالت چسبان خارج می‌شوند.
- در صفحهٔ تماس، روش‌های تماس **پیش از** فرم بلند نمایش داده می‌شوند (با order در CSS).
- افکت‌های hover فقط در \`@media (hover:hover) and (pointer:fine)\`.
- \`@media (prefers-reduced-motion: reduce)\` همهٔ انیمیشن‌ها را غیرفعال می‌کند.

## ماتریس تست دستی (باید روی دستگاه واقعی انجام شود)

| عرض | باید بررسی شود |
|---|---|
| ۱۴۴۰px | تراز ستون‌ها، طول خط متن فارسی، چسبندگی ستون خرید |
| ۱۲۸۰px | عدم سرریز افقی، اندازهٔ عنوان‌ها |
| ۱۰۲۴px | تبدیل گرید ۴ستونه به ۲ستونه، منوی سربرگ |
| ۷۶۸px | منوی موبایل، تک‌ستونه شدن محتوا |
| ۴۳۰px | فرم‌ها، جدول سبد خرید، پیمایش درس‌ها |
| ۳۹۰px | نوار پیشرفت، کارت کلاس‌ها، دکمه‌ها |
| ۳۶۰px | عدم سرریز در جدول‌ها و OTP |

## مواردی که باید به‌طور ویژه دید

- جدول سبد خرید و تسویه‌حساب (اسکرول افقی مجاز است اما نباید صفحه را بشکند).
- سرفصل دوره در موبایل باید خوانا بماند.
- فرم OTP و شمارش معکوس ارسال دوباره.
- ناوبری دروس در پخش‌کنندهٔ دوره.
- نقشه در صفحهٔ تماس و کلاس حضوری.

## نتیجهٔ تست را ثبت کنید

پس از اجرا، خروجی را در این فایل یا در \`docs/VALIDATION-REPORT.md\` ثبت کنید تا
در تحویل نهایی قابل استناد باشد.
`;
writeFileSync(path.join(docsDir, 'RESPONSIVE-QA.md'), responsiveQa, 'utf8');

/* ==================================================== DESIGN-SYSTEM.md */
const designSystem = `# دیزاین سیستم

## رنگ‌ها

| نقش | مقدار |
|---|---|
| پس‌زمینه | ${C.bg} |
| سطح | ${C.surface} |
| سطح فرعی | ${C.surfaceAlt} |
| سرمه‌ای | ${C.navy} |
| سرمه‌ای hover | ${C.navyHover} |
| آجری | ${C.red} |
| آجری hover | ${C.redHover} |
| فیروزه‌ای | ${C.teal} |
| کرم | ${C.cream} |
| متن اصلی | ${C.text} |
| متن فرعی | ${C.muted} |

## تایپوگرافی

- نمایشی/تیتر: **${FONT.display}**
- رابط/متن/دکمه: **${FONT.ui}**
- بدنهٔ فارسی: ۱۵–۱۷px با ارتفاع خط ۱٫۹۵–۲٫۱
- H1 حدود ۳۲–۶۰px (شناور با clamp)، H2 حدود ۲۶–۴۴px

## فضاها

- حداکثر عرض محتوا: ${LAYOUT.max}px
- فاصلهٔ کناری دسکتاپ: ${LAYOUT.gutterDesktop}px (معادل \`calc(100% - 64px)\`)
- فاصلهٔ کناری موبایل: ${LAYOUT.gutterMobile}px (معادل \`calc(100% - 24px)\`)
- شعاع کارت: ${LAYOUT.cardRadius}px · شعاع دکمه: ${LAYOUT.btnRadius}px · شعاع کنترل: ${LAYOUT.controlRadius}px

## امضای بصری

ساختار قالی/گلیم از طریق «نوار بافت» (\`.az-rule\`)، قاب‌بندی نامتقارن،
شبکه‌های بافته‌شده و فاصله‌گذاری ادیتوریال اعمال می‌شود — نه تزئینات پراکنده.
هر صفحه یک حرکت بصری شاخص دارد و بقیهٔ اجزا مهار شده‌اند.

## فایل CSS

خروجی کامل CSS در \`docs/design-system.css\` است. در هر قالب، همین CSS به‌صورت
\`custom_css\` روی کانتینر ریشه درج شده و با توکن \`selector\` محدود شده است،
بنابراین هیچ قانونی روی سایر صفحات اثر نمی‌گذارد.
`;
writeFileSync(path.join(docsDir, 'DESIGN-SYSTEM.md'), designSystem, 'utf8');
writeFileSync(path.join(docsDir, 'design-system.css'), `${DESIGN_SYSTEM_CSS.replace(/selector/g, '.az-page')}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      written: [
        'docs/TEMPLATE-MAP.csv',
        'docs/README-FA.md',
        'docs/PLUGIN-DEPENDENCIES.md',
        'docs/SHORTCODE-MAP.md',
        'docs/DYNAMIC-FIELD-MAP.md',
        'docs/THEME-BUILDER-CONDITIONS.md',
        'docs/MANUAL-STEPS.md',
        'docs/UNRESOLVED-INTEGRATIONS.md',
        'docs/RESPONSIVE-QA.md',
        'docs/DESIGN-SYSTEM.md',
        'docs/design-system.css',
      ],
      templates: templates.length,
    },
    null,
    2
  )
);
