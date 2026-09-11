/**
 * Utility, search, loop items and error/empty states (spec §31, §19, §44).
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
  mediaFrame,
  shortcodeWidget,
  htmlBlock,
  divider,
  spacer,
  patternStrip,
  widget,
  searchForm,
} from '../dom.mjs';
import {
  section,
  pageHero,
  sectionHead,
  card,
  courseCard,
  artworkCard,
  mount,
  ctaBand,
  faqBlock,
  proseBlock,
  stateBlock,
  emptyState,
  metaRow,
  breadcrumbs,
  searchBlock,
  toPersianNum,
} from '../sections/ui.mjs';
import { NAV, BRAND, CONTACT } from '../content/site.mjs';
import { COURSES, WORKSHOPS, INSTRUCTORS, ARTWORKS } from '../content/catalog.mjs';
import { STATES, UI } from '../content/copy.mjs';
import { sc } from '../shortcodes.mjs';
import { define } from '../registry.mjs';

/* ================================================================ SEARCH */
function searchBuild(doc) {
  return [
    pageHero(doc, 'srch-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'جست‌وجو', url: '/search' }],
      kicker: 'جست‌وجو',
      title: 'در سایت جست‌وجو کنید',
      lead: 'دوره، کلاس حضوری، نوشته یا محصول را پیدا کنید.',
      navTitle: 'Search — سربرگ',
    }),
    section(
      doc,
      'srch-body',
      [
        searchBlock(doc, 'srch-form', { title: 'جست‌وجو', navTitle: 'Search — فرم' }),
        container(doc, 'srch-mount', [shortcodeWidget(doc, 'srch-sc', sc('az_search_results'), { title: 'نتایج جست‌وجو' })], { title: 'نتایج', cls: 'az-mount az-search-results', g: 0 }),
        container(
          doc,
          'srch-suggest',
          [
            sectionHead(doc, 'srch-suggest', { title: 'اگر نتیجه‌ای پیدا نکردید', lead: 'این مسیرها معمولاً سریع‌تر به مقصد می‌رسند.' }),
            grid(
              doc,
              'srch-suggest-grid',
              [
                { label: 'دوره‌های آنلاین', url: '/courses' },
                { label: 'کلاس‌های حضوری', url: '/workshops' },
                { label: 'مسیرهای یادگیری', url: '/learning-paths' },
                { label: 'تماس با کارگاه', url: '/contact' },
              ].map((s, i) => card(doc, `srch-s-${i}`, { navTitle: `پیشنهاد — ${s.label}`, title: s.label, actions: [{ label: 'باز کردن', url: s.url, variant: 'ghost' }] })),
              { cols: 4, tablet: 2, mobile: 1, title: 'پیشنهادها', cls: 'az-grid az-grid--4' }
            ),
          ],
          { title: 'بخش — پیشنهادها', cls: 'az-stack', g: 14 }
        ),
      ],
      { title: 'Search — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
  ];
}

function noResultsBuild(doc) {
  return [
    pageHero(doc, 'nr-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'جست‌وجو', url: '/search' }],
      kicker: 'بدون نتیجه',
      title: 'نتیجه‌ای پیدا نشد',
      lead: 'عبارت جست‌وجو را کوتاه‌تر کنید یا از فهرست زیر ادامه دهید.',
      navTitle: 'No Results — سربرگ',
    }),
    section(
      doc,
      'nr-body',
      [
        searchBlock(doc, 'nr-form', { title: 'جست‌وجوی دوباره', navTitle: 'No Results — فرم' }),
        stateBlock(doc, 'nr-state', {
          tone: 'neutral',
          icon: 'fas fa-seedling',
          title: STATES.noResults.title,
          body: STATES.noResults.body,
          navTitle: 'وضعیت — بدون نتیجه',
        }),
        container(doc, 'nr-mount', [shortcodeWidget(doc, 'nr-sc', sc('az_no_results'), { title: 'پیشنهادهای جایگزین' })], { title: 'پیشنهادها', cls: 'az-mount', g: 0 }),
        grid(
          doc,
          'nr-grid',
          COURSES.slice(0, 3).map((c, i) => courseCard(doc, `nr-c-${i}`, c)),
          { cols: 3, tablet: 2, mobile: 1, title: 'دوره‌های پیشنهادی', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'No Results — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    ctaBand(doc, 'nr-cta', { title: 'پیدا نکردید؟', body: 'بپرسید تا راهنمایی‌تان کنیم.', primary: { label: 'تماس با کارگاه', url: '/contact' }, navTitle: 'No Results — دعوت به اقدام' }),
  ];
}

/* =================================================================== 404 */
function notFoundBuild(doc) {
  return [
    section(
      doc,
      'nf-hero',
      [
        container(
          doc,
          'nf-grid',
          [
            container(
              doc,
              'nf-copy',
              [
                kicker(doc, 'nf-kicker', 'خطای ۴۰۴', { cls: 'az-kicker az-kicker--red' }),
                heading(doc, 'nf-title', STATES.error404.title, { level: 'h1', title: 'H1 — ۴۰۴' }),
                paragraph(doc, 'nf-body', STATES.error404.body, { size: 16, color: C.muted }),
                searchBlock(doc, 'nf-search', { title: 'جست‌وجو در سایت', navTitle: 'جست‌وجوی ۴۰۴' }),
                container(doc, 'nf-actions', [button(doc, 'nf-a1', 'بازگشت به خانه', '/', { variant: 'primary', block: true, title: 'CTA — خانه' }), button(doc, 'nf-a2', 'صفحهٔ پشتیبانی', '/support', { variant: 'outline', block: true, title: 'CTA — پشتیبانی' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }),
              ],
              { title: 'متن ۴۰۴', cls: 'az-stack', g: 14 }
            ),
            container(
              doc,
              'nf-links',
              [
                heading(doc, 'nf-links-title', 'مسیرهای پرکاربرد', { level: 'h2', title: 'H2 — مسیرها' }),
                iconList(doc, 'nf-links-list', [
                  '<a href="/courses">دوره‌های آنلاین</a>',
                  '<a href="/workshops">کلاس‌های حضوری</a>',
                  '<a href="/learning-paths">مسیرهای یادگیری</a>',
                  '<a href="/blog">مجلهٔ کارگاه</a>',
                  '<a href="/contact">تماس با کارگاه</a>',
                ], { title: 'مسیرها' }),
              ],
              { title: 'کارت مسیرها', cls: 'az-card az-stack', g: 10 }
            ),
          ],
          { title: 'شبکهٔ ۴۰۴', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 30, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Not Found — بدنه', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
  ];
}

function genericErrorBuild(doc) {
  return [
    section(
      doc,
      'ge-hero',
      [
        container(
          doc,
          'ge-stack',
          [
            stateBlock(doc, 'ge-state', {
              tone: 'danger',
              icon: 'fas fa-inbox',
              level: 'h1',
              title: STATES.genericError.title,
              body: STATES.genericError.body,
              actions: [{ label: 'تلاش دوباره', url: '/' }, { label: 'پشتیبانی', url: '/support', variant: 'ghost' }],
              navTitle: 'وضعیت — خطای عمومی',
            }),
            container(
              doc,
              'ge-detail',
              [
                heading(doc, 'ge-detail-title', 'جزئیات فنی', { level: 'h3', title: 'H3 — جزئیات' }),
                paragraph(doc, 'ge-detail-text', 'کد خطا در لاگ‌های سرور ثبت می‌شود. هنگام تماس با پشتیبانی، زمان تقریبی بروز خطا را اعلام کنید.', { size: 14, color: C.muted }),
              ],
              { title: 'کارت جزئیات', cls: 'az-card az-card--flat az-stack', g: 8 }
            ),
          ],
          { title: 'ستون خطا', cls: 'az-stack', g: 16 }
        ),
      ],
      { title: 'Generic Error — بدنه', cls: 'az-section', innerCls: 'az-wrap az-narrow' }
    ),
  ];
}

function maintenanceBuild(doc) {
  return [
    section(
      doc,
      'mt-hero',
      [
        container(
          doc,
          'mt-stack',
          [
            container(doc, 'mt-logo', [mediaFrame(doc, 'mt-frame', { label: BRAND.short, note: BRAND.tagline, ratio: '16 / 9', title: 'قاب لوگو' })], { title: 'لوگو', cls: 'az-mt-logo', g: 0 }),
            heading(doc, 'mt-title', STATES.maintenance.title, { level: 'h1', align: 'center', title: 'H1 — در دست تعمیر' }),
            paragraph(doc, 'mt-body', STATES.maintenance.body, { align: 'center', size: 16, color: C.muted }),
            container(doc, 'mt-actions', [button(doc, 'mt-a1', 'تماس با کارگاه', '/contact', { variant: 'primary', block: true, title: 'CTA — تماس' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', justify: 'center', g: 12 }),
            metaRow(doc, 'mt', [`تلفن: ${CONTACT.phone}`, CONTACT.hoursWeek], { title: 'اطلاعات تماس', cls: 'az-mt-contact' }),
          ],
          { title: 'ستون در دست تعمیر', cls: 'az-stack az-state', align: 'center', g: 16 }
        ),
      ],
      { title: 'Maintenance — بدنه', cls: 'az-section', innerCls: 'az-wrap az-narrow', bg: C.surface }
    ),
  ];
}

export function registerUtility() {
  define({ slug: 'search', title: 'جست‌وجو', docType: 'page', group: 'Utility', page: '/search', plugins: ['elementor', 'kit-php'], dynamic: 'نتایج وردپرس', url: '/search', condition: '', manual: 'در صورت استفاده از قالب Search Results المنتور پرو، این صفحه را به آن متصل کنید.', status: 'READY' }, searchBuild);
  define({ slug: 'no-results', title: 'بدون نتیجه', docType: 'page', group: 'Utility', page: '/search (بدون نتیجه)', plugins: ['elementor', 'kit-php'], dynamic: 'az_no_results', url: '/search', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, noResultsBuild);
  define({ slug: 'not-found', title: 'صفحهٔ ۴۰۴', docType: 'page', group: 'Utility', page: '/404', plugins: ['elementor'], dynamic: '', url: '/404', condition: '', manual: 'در صورت فعال‌بودن قالب ۴۰۴ المنتور پرو، از همان استفاده کنید.', status: 'READY' }, notFoundBuild);
  define({ slug: 'generic-error', title: 'خطای عمومی', docType: 'page', group: 'Utility', page: '/error', plugins: ['elementor'], dynamic: '', url: '/error', condition: '', manual: '', status: 'READY' }, genericErrorBuild);
  define({ slug: 'maintenance', title: 'در دست تعمیر', docType: 'page', group: 'Utility', page: '/maintenance', plugins: ['elementor'], dynamic: '', url: '/maintenance', condition: '', manual: 'در زمان فعال‌سازی، این صفحه را به‌عنوان صفحهٔ نگه‌دارنده تنظیم کنید.', status: 'READY' }, maintenanceBuild);
}
