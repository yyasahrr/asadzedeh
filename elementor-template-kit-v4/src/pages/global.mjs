/**
 * Global chrome: header, footer, and reusable section templates.
 * These are Theme Builder documents (type: header / footer / section).
 */
import { C, edge, gap, LAYOUT } from '../tokens.mjs';
import {
  container,
  grid,
  heading,
  paragraph,
  button,
  kicker,
  iconList,
  imageWidget,
  shortcodeWidget,
  htmlBlock,
  divider,
  spacer,
  patternStrip,
  widget,
  searchForm,
} from '../dom.mjs';
import { section, stateBlock, emptyState, ctaBand, metaRow, trustStrip } from '../sections/ui.mjs';
import { BRAND, CONTACT, NAV, SOCIAL, TRUST } from '../content/site.mjs';
import { UI } from '../content/copy.mjs';
import { sc } from '../shortcodes.mjs';
import { define } from '../registry.mjs';

/* ---------------------------------------------------------------- header */
function headerBuild(doc) {
  const topbar = container(
    doc,
    'topbar',
    [
      container(
        doc,
        'topbar-inner',
        [
          paragraph(doc, 'topbar-note', `آموزش فرش، گلیم و رنگرزی سنتی — ${CONTACT.hoursWeek}`, {
            size: 13,
            color: '#EFE6D6',
            cls: 'az-topbar-note',
            margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true },
          }),
          container(
            doc,
            'topbar-links',
            [
              htmlBlock(
                doc,
                'topbar-links-html',
                `<div class="az-topbar-links" dir="rtl"><a href="${CONTACT.phoneHref}">${CONTACT.phone}</a><span aria-hidden="true">·</span><a href="/verify">${'استعلام گواهی'}</a><span aria-hidden="true">·</span><a href="/support">${UI.support}</a></div>`,
                { title: 'لینک‌های بالای سربرگ', cls: 'az-topbar-links-wrap' }
              ),
            ],
            { title: 'لینک‌های بالا', cls: 'az-topbar-links-cell', g: 0 }
          ),
        ],
        {
          title: 'ردیف بالای سربرگ — محتوا',
          cls: 'az-wrap az-topbar-inner',
          direction: 'row',
          wrap: 'wrap',
          justify: 'space-between',
          align: 'center',
          boxed: true,
          g: 12,
          responsive: { mobile: { flex_direction: 'column', align_items: 'flex-start', flex_gap: { column: '6', row: '6', unit: 'px', size: 6, isLinked: true } } },
        }
      ),
    ],
    {
      title: 'ردیف بالای سربرگ',
      cls: 'az-topbar',
      bg: C.navy,
      padding: { unit: 'px', top: '8', right: '0', bottom: '8', left: '0', isLinked: false },
      responsive: { mobile: { padding: { unit: 'px', top: '6', right: '0', bottom: '6', left: '0', isLinked: false } } },
    }
  );

  const logoCol = container(
    doc,
    'logo',
    [
      widget(
        doc,
        'logo-widget',
        'theme-site-logo',
        {
          align: 'right',
          width: { unit: 'px', size: 150, sizes: [] },
          caption: BRAND.name,
          image_border_radius: edge(10),
        },
        { title: 'لوگو', cls: 'az-logo' }
      ),
    ],
    { title: 'لوگو', cls: 'az-header-logo', justify: 'center', g: 0 }
  );

  const navCol = container(
    doc,
    'nav',
    [
      widget(
        doc,
        'nav-widget',
        'nav-menu',
        {
          layout: 'horizontal',
          align_items: 'stretch',
          pointer: 'underline',
          animation: 'fade',
          indicator: 'none',
          color_menu_item: C.text,
          color_menu_item_hover: C.red,
          color_menu_item_active: C.navy,
          typography_typography: 'custom',
          typography_font_family: 'Peyda',
          typography_font_size: { unit: 'px', size: 15, sizes: [] },
          typography_font_weight: '600',
          padding_horizontal_menu_item: { unit: 'px', size: 11, sizes: [] },
          toggle_align: 'center',
          toggle_color: C.navy,
        },
        { title: 'منوی اصلی', cls: 'az-main-nav' }
      ),
    ],
    { title: 'ناوبری اصلی', cls: 'az-header-nav', justify: 'center', g: 0 }
  );

  const actionsCol = container(
    doc,
    'actions',
    [
      container(
        doc,
        'actions-row',
        [
          container(doc, 'search-cell', [searchForm(doc, 'search', { placeholder: 'جست‌وجو' })], {
            title: 'جست‌وجو',
            cls: 'az-header-search',
            g: 0,
            width: { unit: '%', size: '38' },
          }),
          button(doc, 'account-btn', 'ورود / حساب', '/auth', { variant: 'outline', size: 'sm', title: 'CTA — ورود به حساب' }),
          button(doc, 'cta-btn', 'دوره‌های آنلاین', '/courses', { variant: 'primary', size: 'sm', title: 'CTA — دوره‌های آنلاین' }),
        ],
        {
          title: 'اقدام‌های سربرگ',
          cls: 'az-header-actions',
          direction: 'row',
          wrap: 'wrap',
          justify: 'flex-end',
          align: 'center',
          g: 8,
          responsive: { mobile: { flex_direction: 'row', justify_content: 'space-between' } },
        }
      ),
    ],
    { title: 'اقدام‌ها', cls: 'az-header-actions-col', justify: 'center', g: 0 }
  );

  const mainRow = container(
    doc,
    'main',
    [
      container(
        doc,
        'main-inner',
        [logoCol, navCol, actionsCol],
        {
          title: 'ردیف اصلی سربرگ — شبکه',
          cls: 'az-wrap az-header-grid',
          boxed: true,
          direction: 'row',
          wrap: 'nowrap',
          align: 'center',
          justify: 'space-between',
          g: 18,
          responsive: {
            tablet: { flex_direction: 'row', flex_wrap: 'wrap' },
            mobile: { flex_direction: 'column', flex_wrap: 'wrap', align_items: 'stretch' },
          },
        }
      ),
    ],
    {
      title: 'ردیف اصلی سربرگ',
      cls: 'az-header-main',
      bg: C.bg,
      padding: { unit: 'px', top: '14', right: '0', bottom: '14', left: '0', isLinked: false },
      border: { width: edge(0, 0, 1, 0), color: C.line },
    }
  );

  return [
    container(
      doc,
      'header-root',
      [
        topbar,
        mainRow,
        // mobile utility strip: contact + CTA visible first on small screens
        container(
          doc,
          'mobile-strip',
          [
            container(
              doc,
              'mobile-strip-inner',
              [
                htmlBlock(
                  doc,
                  'mobile-strip-html',
                  `<div class="az-header-mobile-strip" dir="rtl"><a class="az-btn az-btn--ghost" href="${CONTACT.phoneHref}">تماس تلفنی</a><a class="az-btn az-btn--accent" href="/courses">دوره‌های آنلاین</a></div>`,
                  { title: 'نوار موبایل', cls: 'az-header-mobile-strip-wrap' }
                ),
              ],
              { title: 'نوار موبایل — محتوا', cls: 'az-wrap', boxed: true, g: 0 }
            ),
          ],
          {
            title: 'نوار ابزار موبایل',
            cls: 'az-header-mobile-only',
            bg: C.surface,
            padding: { unit: 'px', top: '8', right: '0', bottom: '8', left: '0', isLinked: false },
            customCss: `@media (min-width:768px){ selector{ display:none!important; } }\nselector .az-header-mobile-strip{ display:flex; gap:8px; }\nselector .az-btn{ flex:1; min-height:44px; }`,
          }
        ),
      ],
      {
        title: 'سربرگ سایت',
        cls: 'az-header az-page',
        g: 0,
        sticky: 'top',
        customCss: `selector{ background:${C.bg}; z-index:50; box-shadow:0 1px 0 ${C.line}; }\nselector .az-topbar-note, selector .az-topbar-links a{ color:#EFE6D6; }\n@media (max-width:767px){ selector .az-topbar-links{ display:none; } }`,
      }
    ),
  ];
}

/* ---------------------------------------------------------------- footer */
function footerBuild(doc) {
  const linkCol = (title, links, seed) =>
    container(
      doc,
      seed,
      [
        heading(doc, `${seed}-title`, title, { level: 'h4', size: 17, title: `H4 — ${title}` }),
        container(
          doc,
          `${seed}-links`,
          links.map((l, i) =>
            container(doc, `${seed}-l-${i}`, [htmlBlock(doc, `${seed}-lh-${i}`, `<a href="${l.url}" dir="rtl">${l.label}</a>`, { title: `لینک — ${l.label}`, cls: 'az-footer-link' })], {
              title: `لینک — ${l.label}`,
              cls: 'az-footer-link-cell',
              g: 0,
            })
          ),
          { title: `لینک‌های ${title}`, cls: 'az-stack az-footer-links', g: 8 }
        ),
      ],
      { title: `ستون — ${title}`, cls: 'az-footer-col az-stack', g: 12 }
    );

  return [
    container(
      doc,
      'footer-root',
      [
        container(
          doc,
          'footer-top',
          [
            container(
              doc,
              'footer-top-inner',
              [
                grid(
                  doc,
                  'footer-cols',
                  [
                    container(
                      doc,
                      'footer-brand',
                      [
                        imageWidget(doc, 'footer-logo', { alt: BRAND.name, cls: 'az-footer-logo', title: 'لوگوی پابرگ' }),
                        paragraph(doc, 'footer-tagline', BRAND.tagline, { size: 14.5, color: '#EFE6D6', cls: 'az-footer-tagline' }),
                        iconList(
                          doc,
                          'footer-contact',
                          [`<a href="${CONTACT.phoneHref}" dir="ltr">${CONTACT.phone}</a>`, `<a href="mailto:${CONTACT.email}" dir="ltr">${CONTACT.email}</a>`, CONTACT.addressShort],
                          { title: 'اطلاعات تماس', color: '#E8D8B8', textColor: '#EFE6D6', size: 13, gapSize: 10 }
                        ),
                      ],
                      { title: 'ستون برند', cls: 'az-footer-col az-stack', g: 12 }
                    ),
                    ...NAV.footer.map((col, i) => linkCol(col.title, col.links, `footer-col-${i}`)),
                  ],
                  { cols: 4, tablet: 2, mobile: 1, title: 'ستون‌های پابرگ', cls: 'az-grid az-grid--4 az-footer-grid' }
                ),
              ],
              { title: 'پابرگ — محتوا', cls: 'az-wrap', boxed: true, g: 26 }
            ),
          ],
          { title: 'بخش بالای پابرگ', cls: 'az-footer-top', bg: C.navy, padding: { unit: 'px', top: '52', right: '0', bottom: '38', left: '0', isLinked: false } }
        ),
        container(
          doc,
          'footer-social',
          [
            container(
              doc,
              'footer-social-inner',
              [
                patternStrip(doc, 'footer-rule', { cls: 'az-rule', title: 'نوار بافت پابرگ' }),
                container(
                  doc,
                  'footer-social-row',
                  [
                    htmlBlock(
                      doc,
                      'footer-social-html',
                      `<div class="az-social-row" dir="rtl">${Object.values(SOCIAL)
                        .map((s) => `<a href="${s.url}" rel="noopener">${s.label}</a>`)
                        .join('<span aria-hidden="true">·</span>')}</div>`,
                      { title: 'شبکه‌های اجتماعی', cls: 'az-social-wrap' }
                    ),
                  ],
                  { title: 'شبکه‌های اجتماعی', cls: 'az-social-cell', g: 0 }
                ),
              ],
              { title: 'ردیف اجتماعی — محتوا', cls: 'az-wrap', boxed: true, g: 16 }
            ),
          ],
          { title: 'ردیف اجتماعی', cls: 'az-footer-social', bg: C.navy, padding: { unit: 'px', top: '0', right: '0', bottom: '26', left: '0', isLinked: false } }
        ),
        container(
          doc,
          'footer-legal',
          [
            container(
              doc,
              'footer-legal-inner',
              [
                paragraph(doc, 'footer-copy', `© ${BRAND.name} — ${BRAND.since}`, {
                  size: 13,
                  color: C.muted,
                  cls: 'az-footer-copy',
                  margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true },
                }),
                htmlBlock(
                  doc,
                  'footer-legal-links',
                  `<div class="az-legal-links" dir="rtl"><a href="/privacy">حریم خصوصی</a><span aria-hidden="true">·</span><a href="/terms">شرایط استفاده</a><span aria-hidden="true">·</span><a href="/rules">قوانین</a><span aria-hidden="true">·</span><a href="/refund">بازگشت وجه</a></div>`,
                  { title: 'لینک‌های حقوقی', cls: 'az-legal-links-wrap' }
                ),
              ],
              {
                title: 'ردیف حقوقی — محتوا',
                cls: 'az-wrap az-footer-legal-inner',
                boxed: true,
                direction: 'row',
                wrap: 'wrap',
                justify: 'space-between',
                align: 'center',
                g: 12,
                responsive: { mobile: { flex_direction: 'column', align_items: 'flex-start' } },
              }
            ),
          ],
          { title: 'ردیف حقوقی', cls: 'az-footer-legal', bg: C.surface, padding: { unit: 'px', top: '16', right: '0', bottom: '16', left: '0', isLinked: false } }
        ),
      ],
      { title: 'پابرگ سایت', cls: 'az-footer az-page', g: 0 }
    ),
  ];
}

/* --------------------------------------------------- reusable sections */
function reusableHeroBuild(doc) {
  return [
    section(
      doc,
      'pattern-hero',
      [
        container(
          doc,
          'pattern-hero-inner',
          [
            kicker(doc, 'ph-kicker', 'برچسب بخش'),
            heading(doc, 'ph-title', 'عنوان بخش را اینجا بنویسید', { level: 'h2', title: 'H2 — عنوان بخش' }),
            paragraph(doc, 'ph-lead', 'یک پاراگراف معرفی کوتاه که هدف این بخش را توضیح می‌دهد.', { size: 16, color: C.muted }),
          ],
          { title: 'قسمت Hero تکرارشونده', cls: 'az-stack', g: 12 }
        ),
      ],
      { title: 'الگوی Hero', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),
  ];
}

function reusableCtaBuild(doc) {
  return [
    ctaBand(doc, 'pattern-cta', {
      title: 'آماده‌اید شروع کنید؟',
      body: 'اگر بین دورهٔ آنلاین، مسیر یادگیری یا کلاس حضوری مردد هستید، صفحهٔ راهنما کمک می‌کند انتخاب دقیق‌تری داشته باشید.',
      primary: { label: 'از کجا شروع کنم؟', url: '/start-here' },
      secondary: { label: 'مشاهدهٔ دوره‌ها', url: '/courses' },
      navTitle: 'الگوی دعوت به اقدام',
    }),
  ];
}

function reusableEmptyBuild(doc) {
  return [
    section(
      doc,
      'pattern-empty',
      [
        stateBlock(doc, 'pattern-empty-state', {
          title: 'موردی برای نمایش وجود ندارد',
          body: 'پس از ثبت دادهٔ واقعی، این وضعیت جایگزین محتوای خالی می‌شود.',
          actions: [{ label: 'بازگشت به داشبورد', url: '/dashboard' }],
          navTitle: 'الگوی وضعیت خالی',
        }),
      ],
      { title: 'الگوی وضعیت خالی', cls: 'az-section az-section--tight', innerCls: 'az-wrap' }
    ),
  ];
}

function reusableTrustBuild(doc) {
  return [trustStrip(doc, 'pattern-trust', TRUST.items, { note: TRUST.note, navTitle: 'الگوی نوار اعتماد' })];
}

/* ------------------------------------------------------------- registry */
export function registerGlobal() {
  define(
    {
      slug: 'header',
      title: 'سربرگ — کل سایت',
      docType: 'header',
      group: 'Global',
      page: 'تمام صفحات',
      plugins: ['elementor-pro'],
      dynamic: 'لوگو و منوی سایت از تنظیمات وردپرس',
      url: '',
      condition: 'Theme Builder → Header → Entire Site',
      manual: 'پس از Import: ویجت Nav Menu را باز کنید و منوی اصلی سایت را انتخاب کنید. لوگو در صورت نبود site logo، تصویر جایگزین قرار دهید.',
      status: 'READY — NEEDS DYNAMIC BINDING',
    },
    headerBuild
  );

  define(
    {
      slug: 'footer',
      title: 'پابرگ — کل سایت',
      docType: 'footer',
      group: 'Global',
      page: 'تمام صفحات',
      plugins: ['elementor-pro'],
      dynamic: 'اطلاعات تماس از متن قالب',
      url: '',
      condition: 'Theme Builder → Footer → Entire Site',
      manual: 'لینک‌های شبکه‌های اجتماعی و اطلاعات تماس را با مقادیر واقعی جایگزین کنید.',
      status: 'READY — NEEDS REAL CONTENT',
    },
    footerBuild
  );

  define(
    {
      slug: 'section-hero',
      title: 'بخش قابل‌استفاده — Hero',
      docType: 'section',
      group: 'Reusable',
      page: 'هر صفحه',
      plugins: ['elementor'],
      dynamic: '',
      url: '',
      condition: 'ندارد (درج دستی در صفحات)',
      manual: 'از طریق کتابخانهٔ المنتور در هر صفحه درج شود.',
      status: 'READY',
    },
    reusableHeroBuild
  );

  define(
    {
      slug: 'section-cta',
      title: 'بخش قابل‌استفاده — دعوت به اقدام',
      docType: 'section',
      group: 'Reusable',
      page: 'هر صفحه',
      plugins: ['elementor'],
      dynamic: '',
      url: '',
      condition: 'ندارد (درج دستی در صفحات)',
      manual: 'از طریق کتابخانهٔ المنتور در هر صفحه درج شود.',
      status: 'READY',
    },
    reusableCtaBuild
  );

  define(
    {
      slug: 'section-empty-state',
      title: 'بخش قابل‌استفاده — وضعیت خالی',
      docType: 'section',
      group: 'Reusable',
      page: 'هر صفحه',
      plugins: ['elementor'],
      dynamic: '',
      url: '',
      condition: 'ندارد (درج دستی در صفحات)',
      manual: 'برای وضعیت‌های بدون داده در پنل هنرجو استفاده شود.',
      status: 'READY',
    },
    reusableEmptyBuild
  );

  define(
    {
      slug: 'section-trust',
      title: 'بخش قابل‌استفاده — نوار اعتماد',
      docType: 'section',
      group: 'Reusable',
      page: 'هر صفحه',
      plugins: ['elementor'],
      dynamic: '',
      url: '',
      condition: 'ندارد (درج دستی در صفحات)',
      manual: 'متن موارد را با مزایای واقعی کارگاه جایگزین کنید؛ عمداً بدون عدد است.',
      status: 'READY — NEEDS REAL CONTENT',
    },
    reusableTrustBuild
  );
}
