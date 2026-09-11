/**
 * Online course system, learning paths, workshops and commerce singles.
 *
 * These are the pages where previous kits collapsed into "title + shortcode".
 * Every mount here is wrapped in real composition: hero, hierarchy, states,
 * sticky rail, related content and CTA (spec §13–§17, §26).
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
  accordion,
  imageWidget,
  mediaFrame,
  videoSlot,
  shortcodeWidget,
  htmlBlock,
  divider,
  spacer,
  patternStrip,
  widget,
  progressBar,
  testimonial,
} from '../dom.mjs';
import {
  section,
  pageHero,
  sectionHead,
  card,
  courseCard,
  pathCard,
  workshopCard,
  instructorCard,
  mount,
  ctaBand,
  faqBlock,
  roadmap,
  galleryBlock,
  proseBlock,
  stateBlock,
  emptyState,
  metaRow,
  breadcrumbs,
  curriculumBlock,
  progressBlock,
  toPersianNum,
} from '../sections/ui.mjs';
import { COURSES, PATHS, WORKSHOPS, INSTRUCTORS, ARTWORKS } from '../content/catalog.mjs';
import { FAQ, STATES, UI } from '../content/copy.mjs';
import { sc } from '../shortcodes.mjs';
import { define } from '../registry.mjs';

/* ======================================================== COURSE ARCHIVE */
function coursesBuild(doc) {
  return [
    pageHero(doc, 'courses-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'دوره‌های آنلاین', url: '/courses' }],
      kicker: 'آموزش آنلاین',
      title: 'دوره‌های آنلاین کارگاه',
      lead: 'دوره‌ها بر اساس رشته و سطح دسته‌بندی شده‌اند. هر دوره شامل تمرین، بررسی تکلیف و در پایان، امکان دریافت گواهی است.',
      meta: ['فرش‌بافی', 'گلیم‌بافی', 'طراحی نقشه', 'رنگرزی', 'مرمت'],
      actions: [{ label: 'راهنمای انتخاب', url: '/start-here', variant: 'outline' }],
      navTitle: 'Courses — سربرگ',
    }),

    section(
      doc,
      'courses-filters',
      [
        container(
          doc,
          'courses-filter-row',
          [
            htmlBlock(
              doc,
              'courses-filter-html',
              `<div class="az-filter-row" dir="rtl">
  <span class="az-filter-label">فیلتر بر اساس:</span>
  <a class="az-badge" href="/courses">همه</a>
  <a class="az-badge" href="/courses?cat=carpet">فرش‌بافی</a>
  <a class="az-badge" href="/courses?cat=kelim">گلیم‌بافی</a>
  <a class="az-badge" href="/courses?cat=design">طراحی نقشه</a>
  <a class="az-badge" href="/courses?cat=dyeing">رنگرزی</a>
  <a class="az-badge" href="/courses?cat=restoration">مرمت و رفو</a>
</div>`,
              { title: 'ردیف فیلتر', cls: 'az-filter-row-wrap' }
            ),
          ],
          { title: 'فیلترها', cls: 'az-filters', g: 0 }
        ),
      ],
      { title: 'Courses — فیلتر', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),

    section(
      doc,
      'courses-list',
      [
        mount(doc, 'courses-mount', {
          code: sc('ld_course_list', { num: 9, col: 3, orderby: 'menu_order', order: 'ASC', show_thumbnail: 'true', progress_bar: 'true' }),
          navTitle: 'فهرست دوره‌های LearnDash',
          note: 'نمونهٔ خروجی در صورت فعال‌نبودن LearnDash یا نبود دوره، با وضعیت خالی زیر جایگزین می‌شود.',
        }),
        container(doc, 'courses-empty', [emptyState(doc, 'courses-empty-state', STATES.emptyCourses, { navTitle: 'وضعیت خالی — دوره‌ها' })], {
          title: 'وضعیت خالی دوره‌ها',
          cls: 'az-empty-slot',
          g: 0,
          customCss: `selector{ display:none; }`,
        }),
      ],
      { title: 'Courses — فهرست', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    section(
      doc,
      'courses-levels',
      [
        sectionHead(doc, 'courses-levels', { title: 'انتخاب بر اساس سطح', lead: 'اگر تجربه ندارید از مقدماتی شروع کنید.' }),
        grid(
          doc,
          'courses-levels-grid',
          COURSES.slice(0, 3).map((c, i) => courseCard(doc, `courses-lvl-${i}`, c)),
          { cols: 3, tablet: 2, mobile: 1, title: 'نمونه دوره‌ها', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Courses — سطح‌ها', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),

    faqBlock(doc, 'courses-faq', FAQ.courses, { title: 'پیش از ثبت‌نام', navTitle: 'Courses — پرسش‌ها' }),

    ctaBand(doc, 'courses-cta', {
      title: 'نمی‌دانید کدام دوره را انتخاب کنید؟',
      body: 'مسیرهای یادگیری چند دوره را با هدف مشخص پشت‌سرهم می‌چینند.',
      primary: { label: 'مسیرهای یادگیری', url: '/learning-paths' },
      secondary: { label: 'راهنمای انتخاب', url: '/start-here' },
      navTitle: 'Courses — دعوت به اقدام',
    }),
  ];
}

/* ========================================================= SINGLE COURSE */
function singleCourseBuild(doc) {
  const rail = container(
    doc,
    'sc-rail',
    [
      container(
        doc,
        'sc-rail-price',
        [
          heading(doc, 'sc-price-title', 'شهریهٔ دوره', { level: 'h3', size: 20, title: 'H3 — شهریهٔ دوره' }),
          container(doc, 'sc-price-mount', [shortcodeWidget(doc, 'sc-price-sc', sc('az_course_meta', { field: 'price' }), { title: 'قیمت داینامیک دوره' })], { title: 'قیمت', cls: 'az-mount az-price', g: 0 }),
          metaRow(doc, 'sc-price', ['REPLACE: شرایط پرداخت'], { title: 'متای قیمت' }),
        ],
        { title: 'بخش قیمت', cls: 'az-stack', g: 8 }
      ),
      divider(doc, 'sc-rail-div'),
      container(
        doc,
        'sc-rail-cta',
        [
          container(doc, 'sc-cta-mount', [shortcodeWidget(doc, 'sc-cta-sc', sc('az_course_cta'), { title: 'دکمهٔ وضعیت ثبت‌نام' })], { title: 'CTA داینامیک', cls: 'az-mount az-cta-mount', g: 0 }),
          button(doc, 'sc-cta-fallback', UI.enroll, '#', { variant: 'primary', block: true, title: 'CTA — ثبت‌نام (جایگزین ثابت)' }),
          button(doc, 'sc-cta-outline', 'پرسش پیش از خرید', '/contact', { variant: 'outline', block: true, title: 'CTA — پرسش پیش از خرید' }),
        ],
        { title: 'دکمه‌های خرید', cls: 'az-stack', g: 10 }
      ),
      divider(doc, 'sc-rail-div2'),
      container(
        doc,
        'sc-rail-includes',
        [
          heading(doc, 'sc-inc-title', 'این دوره شامل', { level: 'h4', title: 'H4 — این دوره شامل' }),
          iconList(doc, 'sc-inc-list', [
            'دسترسی به همهٔ درس‌های دوره',
            'بررسی تکلیف توسط مدرس',
            'منابع و فایل‌های قابل دانلود',
            'گواهی پایان‌دوره در صورت تکمیل',
          ], { title: 'موارد شامل', size: 13, gapSize: 9 }),
        ],
        { title: 'شامل چه چیزهایی است', cls: 'az-stack', g: 8 }
      ),
      divider(doc, 'sc-rail-div3'),
      container(
        doc,
        'sc-rail-support',
        [
          heading(doc, 'sc-sup-title', 'پشتیبانی', { level: 'h4', title: 'H4 — پشتیبانی' }),
          paragraph(doc, 'sc-sup-text', 'پرسش‌های آموزشی از بخش تکالیف و پرسش‌های فنی از صفحهٔ پشتیبانی پیگیری می‌شود.', { size: 13.5, color: C.muted }),
          button(doc, 'sc-sup-btn', UI.support, '/support', { variant: 'ghost', block: true, size: 'sm', title: 'CTA — پشتیبانی' }),
        ],
        { title: 'پشتیبانی', cls: 'az-stack', g: 8 }
      ),
    ],
    {
      title: 'ستون خرید (چسبان)',
      cls: 'az-rail az-card',
      g: 14,
      bg: C.surface,
      border: { color: C.line },
      radius: edge(22),
      padding: { unit: 'px', top: '20', right: '20', bottom: '20', left: '20', isLinked: false },
      sticky: 'top',
      customCss: `selector{ top:96px; box-shadow:0 2px 6px rgba(21,47,61,.06), 0 24px 50px -32px rgba(21,47,61,.30); }\n@media (max-width:860px){ selector{ position:static; top:auto; } }`,
    }
  );

  const main = container(
    doc,
    'sc-main',
    [
      /* outcomes */
      container(
        doc,
        'sc-outcomes',
        [
          heading(doc, 'sc-outcomes-title', 'چه چیزهایی یاد می‌گیرید', { level: 'h2', title: 'H2 — خروجی‌های یادگیری' }),
          iconList(doc, 'sc-outcomes-list', [
            'اجرای اصولی مراحل اصلی دوره روی پروژهٔ واقعی',
            'شناخت مواد، ابزار و تفاوت کیفیت آن‌ها',
            'تشخیص و رفع خطاهای رایج هنگام کار',
            'تحویل یک خروجی کامل در پایان دوره',
          ], { title: 'خروجی‌های یادگیری' }),
        ],
        { title: 'بخش — خروجی‌های یادگیری', cls: 'az-card az-stack', g: 12 }
      ),

      /* progress (only meaningful when enrolled) */
      container(
        doc,
        'sc-progress',
        [
          heading(doc, 'sc-progress-title', 'پیشرفت شما', { level: 'h2', title: 'H2 — پیشرفت شما' }),
          progressBlock(doc, 'sc-progress-bar', { code: sc('learndash_course_progress'), label: 'پیشرفت دوره', navTitle: 'نوار پیشرفت واقعی' }),
          paragraph(doc, 'sc-progress-note', 'اگر هنوز ثبت‌نام نکرده‌اید، این بخش مقدار صفر را نشان می‌دهد.', { size: 13, color: C.muted, cls: 'az-form-note' }),
        ],
        { title: 'بخش — پیشرفت', cls: 'az-card az-stack', g: 10 }
      ),

      /* curriculum */
      curriculumBlock(doc, 'sc-curriculum', {
        title: 'سرفصل دوره',
        lead: 'سرفصل واقعی دوره از LearnDash خوانده می‌شود؛ فهرست زیر نمایشِ طراحی‌شدهٔ همان داده است.',
        code: sc('course_content'),
        items: [
          { title: 'جلسهٔ ۱ — آشنایی با مواد و ابزار', meta: 'REPLACE: مدت جلسه', badge: UI.free },
          { title: 'جلسهٔ ۲ — آماده‌سازی و چله‌کشی', meta: 'REPLACE: مدت جلسه', badge: UI.free },
          { title: 'جلسهٔ ۳ — اجرای اولین بخش', meta: 'REPLACE: مدت جلسه' },
          { title: 'جلسهٔ ۴ — کنترل یکنواختی', meta: 'REPLACE: مدت جلسه', current: true },
          { title: 'جلسهٔ ۵ — اصلاح خطاهای رایج', meta: 'REPLACE: مدت جلسه', locked: true },
          { title: 'جلسهٔ ۶ — پروژهٔ پایانی', meta: 'REPLACE: مدت جلسه', locked: true },
        ],
        navTitle: 'بخش — سرفصل',
      }),

      /* prerequisites + what you receive */
      grid(
        doc,
        'sc-meta-grid',
        [
          container(
            doc,
            'sc-prereq',
            [
              heading(doc, 'sc-prereq-title', 'پیش‌نیازها', { level: 'h3', title: 'H3 — پیش‌نیازها' }),
              paragraph(doc, 'sc-prereq-text', 'REPLACE: پیش‌نیاز دقیق دوره. در صورت نداشتن پیش‌نیاز، همین جمله جایگزین شود: «این دوره بدون پیش‌نیاز برگزار می‌شود.»', { size: 15 }),
              container(doc, 'sc-prereq-mount', [shortcodeWidget(doc, 'sc-prereq-sc', sc('az_course_meta', { field: 'prerequisites' }), { title: 'پیش‌نیاز داینامیک' })], { title: 'پیش‌نیاز داینامیک', cls: 'az-mount', g: 0 }),
            ],
            { title: 'کارت — پیش‌نیازها', cls: 'az-card az-stack', g: 10 }
          ),
          container(
            doc,
            'sc-receive',
            [
              heading(doc, 'sc-receive-title', 'چه چیزهایی دریافت می‌کنید', { level: 'h3', title: 'H3 — دریافتی‌ها' }),
              iconList(doc, 'sc-receive-list', ['فایل‌ها و منابع هر جلسه', 'بررسی مرحله‌ای تکالیف', 'گواهی پایان‌دوره در صورت تکمیل'], { title: 'دریافتی‌ها', size: 14 }),
            ],
            { title: 'کارت — دریافتی‌ها', cls: 'az-card az-stack', g: 10 }
          ),
        ],
        { cols: 2, tablet: 2, mobile: 1, title: 'پیش‌نیاز و دریافتی', cls: 'az-grid az-grid--2' }
      ),

      /* instructor */
      container(
        doc,
        'sc-instructor',
        [
          heading(doc, 'sc-ins-title', 'مدرس دوره', { level: 'h2', title: 'H2 — مدرس دوره' }),
          container(doc, 'sc-ins-mount', [shortcodeWidget(doc, 'sc-ins-sc', sc('az_course_meta', { field: 'instructor' }), { title: 'مدرس داینامیک دوره' })], { title: 'مدرس داینامیک', cls: 'az-mount', g: 0 }),
          container(
            doc,
            'sc-ins-card',
            [
              container(
                doc,
                'sc-ins-card-grid',
                [
                  container(doc, 'sc-ins-media', [mediaFrame(doc, 'sc-ins-frame', { label: 'پرترهٔ مدرس', note: 'جای تصویر', ratio: '1 / 1', title: 'تصویر مدرس' })], { title: 'تصویر مدرس', cls: 'az-ins-media', g: 0, width: { unit: '%', size: '28' } }),
                  container(
                    doc,
                    'sc-ins-copy',
                    [
                      heading(doc, 'sc-ins-name', 'REPLACE: نام مدرس', { level: 'h3', title: 'H3 — نام مدرس' }),
                      paragraph(doc, 'sc-ins-role', 'REPLACE: تخصص مدرس', { size: 14, color: C.muted }),
                      paragraph(doc, 'sc-ins-bio', 'REPLACE: معرفی کوتاه مدرس در دو جمله.', { size: 14.5 }),
                    ],
                    { title: 'متن مدرس', cls: 'az-stack', g: 6, width: { unit: '%', size: '72' } }
                  ),
                ],
                { title: 'شبکهٔ مدرس', cls: 'az-ins-row', direction: 'row', wrap: 'wrap', g: 18, align: 'center', responsive: { mobile: { flex_direction: 'column' } } }
              ),
            ],
            { title: 'کارت مدرس', cls: 'az-card', g: 0 }
          ),
        ],
        { title: 'بخش — مدرس', cls: 'az-stack', g: 14 }
      ),

      /* certificate info */
      container(
        doc,
        'sc-cert',
        [
          container(
            doc,
            'sc-cert-grid',
            [
              container(
                doc,
                'sc-cert-copy',
                [
                  heading(doc, 'sc-cert-title', 'گواهی پایان‌دوره', { level: 'h3', title: 'H3 — گواهی' }),
                  paragraph(doc, 'sc-cert-body', 'پس از تکمیل همهٔ درس‌ها و قبولی در آزمون‌ها، گواهی صادر می‌شود و از بخش گواهی‌های من قابل مشاهده و استعلام است.', { size: 15 }),
                  button(doc, 'sc-cert-btn', 'نحوهٔ استعلام گواهی', '/verify', { variant: 'outline', block: false, size: 'sm', title: 'CTA — استعلام گواهی' }),
                ],
                { title: 'متن گواهی', cls: 'az-stack', g: 10 }
              ),
              container(doc, 'sc-cert-frame', [mediaFrame(doc, 'sc-cert-img', { label: 'نمونهٔ گواهی', note: 'جای تصویر', ratio: '4 / 3', title: 'قاب گواهی' })], { title: 'تصویر گواهی', cls: 'az-cert-media', g: 0 }),
            ],
            { title: 'شبکهٔ گواهی', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 22, responsive: { mobile: { flex_direction: 'column' } } }
          ),
        ],
        { title: 'بخش — گواهی', cls: 'az-card az-cert', g: 0 }
      ),

      faqBlock(doc, 'sc-faq', FAQ.courses, { title: 'پرسش‌های این دوره', navTitle: 'بخش — پرسش‌ها' }),

      container(
        doc,
        'sc-related',
        [
          sectionHead(doc, 'sc-related', { title: 'دوره‌های مرتبط', link: { label: 'همهٔ دوره‌ها', url: '/courses' } }),
          container(doc, 'sc-related-mount', [shortcodeWidget(doc, 'sc-related-sc', sc('az_related_courses', { limit: 3 }), { title: 'دوره‌های مرتبط (داینامیک)' })], { title: 'مرتبط داینامیک', cls: 'az-mount', g: 0 }),
          grid(doc, 'sc-related-fallback', COURSES.slice(0, 3).map((c, i) => courseCard(doc, `sc-rel-${i}`, c)), { cols: 3, tablet: 2, mobile: 1, title: 'مرتبط (جایگزین ثابت)', cls: 'az-grid az-grid--3' }),
        ],
        { title: 'بخش — مرتبط', cls: 'az-stack', g: 16 }
      ),
    ],
    { title: 'ستون اصلی دوره', cls: 'az-stack az-course-main', g: 22 }
  );

  return [
    /* hero */
    section(
      doc,
      'sc-hero',
      [
        breadcrumbs(doc, 'sc', [{ label: 'خانه', url: '/' }, { label: 'دوره‌های آنلاین', url: '/courses' }, { label: 'عنوان دوره', url: '#' }]),
        container(
          doc,
          'sc-hero-grid',
          [
            container(
              doc,
              'sc-hero-copy',
              [
                kicker(doc, 'sc-hero-cat', 'REPLACE: دستهٔ دوره'),
                widget(doc, 'sc-title', 'theme-post-title', {
                  header_size: 'h1',
                  align: 'right',
                  title_color: C.navy,
                  typography_typography: 'custom',
                  typography_font_family: 'Neirizi',
                  typography_font_weight: '400',
                  typography_font_size: { unit: 'px', size: 44, sizes: [] },
                  typography_line_height: { unit: 'em', size: 1.3, sizes: [] },
                }, { title: 'H1 — عنوان دوره (داینامیک)', cls: 'az-dynamic-title' }),
                widget(doc, 'sc-excerpt', 'theme-post-excerpt', {
                  text_color: C.muted,
                  typography_typography: 'custom',
                  typography_font_family: 'Peyda',
                  typography_font_size: { unit: 'px', size: 16.5, sizes: [] },
                  typography_line_height: { unit: 'em', size: 1.95, sizes: [] },
                }, { title: 'خلاصهٔ دوره (داینامیک)', cls: 'az-dynamic-excerpt' }),
                container(
                  doc,
                  'sc-hero-meta',
                  [
                    container(doc, 'sc-meta-dyn', [shortcodeWidget(doc, 'sc-meta-sc', sc('az_course_meta', { field: 'level_duration' }), { title: 'متادادهٔ واقعی دوره' })], { title: 'متادادهٔ داینامیک', cls: 'az-mount', g: 0 }),
                    metaRow(doc, 'sc-hero', ['REPLACE: سطح', 'REPLACE: مدت', 'REPLACE: تعداد جلسات', 'REPLACE: مدرس'], { title: 'متادادهٔ نمونه' }),
                  ],
                  { title: 'متادادهٔ Hero', cls: 'az-stack', g: 10 }
                ),
              ],
              { title: 'متن Hero', cls: 'az-stack', g: 14 }
            ),
            container(
              doc,
              'sc-hero-media',
              [
                widget(doc, 'sc-featured', 'theme-post-featured-image', {
                  link_to: 'none',
                  aspect_ratio: '43',
                  object_fit: 'cover',
                  image_border_radius: edge(20),
                }, { title: 'تصویر شاخص دوره (داینامیک)', cls: 'az-featured-image' }),
                videoSlot(doc, 'sc-trailer', { title: 'ویدیوی معرفی', overlayNote: 'ویدیوی معرفی دوره', cls: 'az-video az-trailer' }),
              ],
              { title: 'رسانهٔ Hero', cls: 'az-stack', g: 12 }
            ),
          ],
          {
            title: 'شبکهٔ Hero',
            cls: 'az-split az-course-hero',
            direction: 'row',
            wrap: 'wrap',
            g: 30,
            responsive: { mobile: { flex_direction: 'column' } },
          }
        ),
      ],
      { title: 'Course — Hero', cls: 'az-section az-course-hero-section', innerCls: 'az-wrap', bg: C.surface }
    ),

    section(
      doc,
      'sc-body',
      [
        container(
          doc,
          'sc-body-grid',
          [main, rail],
          {
            title: 'شبکهٔ اصلی + ستون خرید',
            cls: 'az-split az-course-body',
            direction: 'row',
            wrap: 'wrap',
            g: 30,
            align: 'start',
            responsive: {
              tablet: { flex_direction: 'row', flex_wrap: 'wrap' },
              mobile: { flex_direction: 'column', flex_wrap: 'wrap' },
            },
            customCss: `@media (max-width:860px){ selector > .elementor-element:last-child{ order:-1; } }`,
          }
        ),
      ],
      { title: 'Course — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
  ];
}

/* ================================================================ LESSON */
function lessonBuild(doc) {
  return [
    section(
      doc,
      'ls-hero',
      [
        breadcrumbs(doc, 'ls', [{ label: 'خانه', url: '/' }, { label: 'دوره‌ها', url: '/courses' }, { label: 'نام دوره', url: '#' }, { label: 'عنوان درس', url: '#' }]),
        container(
          doc,
          'ls-head',
          [
            kicker(doc, 'ls-kicker', 'درس'),
            widget(doc, 'ls-title', 'theme-post-title', {
              header_size: 'h1',
              align: 'right',
              title_color: C.navy,
              typography_typography: 'custom',
              typography_font_family: 'Neirizi',
              typography_font_size: { unit: 'px', size: 36, sizes: [] },
            }, { title: 'H1 — عنوان درس', cls: 'az-dynamic-title' }),
            container(doc, 'ls-progress', [shortcodeWidget(doc, 'ls-progress-sc', sc('learndash_course_progress'), { title: 'پیشرفت دوره' })], { title: 'پیشرفت', cls: 'az-mount az-progress-mount', g: 0 }),
          ],
          { title: 'سربرگ درس', cls: 'az-stack', g: 12 }
        ),
      ],
      { title: 'Lesson — سربرگ', cls: 'az-section az-section--tight', innerCls: 'az-wrap az-lesson-wrap', bg: C.surface }
    ),

    section(
      doc,
      'ls-body',
      [
        container(
          doc,
          'ls-grid',
          [
            container(
              doc,
              'ls-main',
              [
                container(doc, 'ls-video', [videoSlot(doc, 'ls-video-widget', { title: 'ویدیوی درس', overlayNote: 'ویدیوی درس', cls: 'az-video az-lesson-video' })], {
                  title: 'رسانهٔ درس',
                  cls: 'az-lesson-media',
                  g: 0,
                  radius: edge(20),
                  overflow: 'hidden',
                  bg: C.dark,
                }),
                container(
                  doc,
                  'ls-content',
                  [
                    heading(doc, 'ls-content-title', 'محتوای درس', { level: 'h2', title: 'H2 — محتوای درس' }),
                    widget(doc, 'ls-content-widget', 'theme-post-content', {
                      text_color: C.text,
                      typography_typography: 'custom',
                      typography_font_family: 'Peyda',
                      typography_font_size: { unit: 'px', size: 16.5, sizes: [] },
                      typography_line_height: { unit: 'em', size: 2, sizes: [] },
                    }, { title: 'محتوای درس (داینامیک)', cls: 'az-mount az-dynamic-content' }),
                  ],
                  { title: 'محتوای درس', cls: 'az-card az-stack', g: 12 }
                ),
                container(
                  doc,
                  'ls-resources',
                  [
                    heading(doc, 'ls-res-title', 'منابع و فایل‌های درس', { level: 'h3', title: 'H3 — منابع' }),
                    iconList(doc, 'ls-res-list', ['REPLACE: فایل نقشه یا دستور کار', 'REPLACE: فایل تمرین'], { title: 'فهرست منابع' }),
                    paragraph(doc, 'ls-res-note', 'فایل‌ها از طریق تنظیمات درس در LearnDash بارگذاری می‌شوند.', { size: 13, color: C.muted, cls: 'az-form-note' }),
                  ],
                  { title: 'کارت منابع', cls: 'az-card az-stack', g: 10 }
                ),
                container(
                  doc,
                  'ls-actions',
                  [
                    container(doc, 'ls-complete-mount', [shortcodeWidget(doc, 'ls-complete-sc', sc('az_course_cta'), { title: 'دکمهٔ اتمام درس (LearnDash)' })], { title: 'اتمام درس', cls: 'az-mount', g: 0 }),
                    button(doc, 'ls-complete', UI.markComplete, '#', { variant: 'primary', block: true, title: 'CTA — اتمام درس' }),
                  ],
                  { title: 'اقدام‌های درس', cls: 'az-stack', g: 10 }
                ),
                container(
                  doc,
                  'ls-nav',
                  [
                    container(
                      doc,
                      'ls-nav-row',
                      [
                        button(doc, 'ls-prev', `‹ ${UI.prevLesson}`, '#', { variant: 'ghost', block: true, title: 'CTA — درس قبلی' }),
                        button(doc, 'ls-next', `${UI.nextLesson} ›`, '#', { variant: 'primary', block: true, title: 'CTA — درس بعدی' }),
                      ],
                      { title: 'ناوبری درس', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }
                    ),
                  ],
                  { title: 'ناوبری', cls: 'az-lesson-nav', g: 0 }
                ),
              ],
              { title: 'ستون اصلی درس', cls: 'az-stack az-lesson-main', g: 18 }
            ),
            container(
              doc,
              'ls-side',
              [
                container(doc, 'ls-side-nav', [shortcodeWidget(doc, 'ls-side-sc', sc('az_course_curriculum'), { title: 'فهرست درس‌های دوره' })], { title: 'فهرست درس‌ها', cls: 'az-mount az-card', g: 0, bg: C.surface, radius: edge(20), border: { color: C.line }, padding: { unit: 'px', top: '16', right: '16', bottom: '16', left: '16', isLinked: false } }),
                container(
                  doc,
                  'ls-note',
                  [
                    heading(doc, 'ls-note-title', 'یادداشت مدرس', { level: 'h4', title: 'H4 — یادداشت مدرس' }),
                    paragraph(doc, 'ls-note-body', 'REPLACE: نکتهٔ مدرس برای این درس — در صورت نداشتن یادداشت، این کارت حذف یا با متن عمومی جایگزین شود.', { size: 14, color: C.muted }),
                  ],
                  { title: 'کارت یادداشت مدرس', cls: 'az-card az-card--cream az-stack', g: 8 }
                ),
              ],
              {
                title: 'ستون کناری درس',
                cls: 'az-rail az-stack',
                g: 16,
                sticky: 'top',
                customCss: `selector{ top:96px; }\n@media (max-width:860px){ selector{ position:static; top:auto; } }`,
              }
            ),
          ],
          {
            title: 'شبکهٔ درس',
            cls: 'az-split az-lesson-grid',
            direction: 'row',
            wrap: 'wrap',
            g: 26,
            align: 'start',
            responsive: { mobile: { flex_direction: 'column' } },
          }
        ),
      ],
      { title: 'Lesson — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
  ];
}

/* ================================================================= TOPIC */
function topicBuild(doc) {
  return [
    section(
      doc,
      'tp-hero',
      [
        breadcrumbs(doc, 'tp', [{ label: 'خانه', url: '/' }, { label: 'دوره‌ها', url: '/courses' }, { label: 'نام دوره', url: '#' }, { label: 'عنوان موضوع', url: '#' }]),
        container(
          doc,
          'tp-head',
          [
            kicker(doc, 'tp-kicker', 'موضوع'),
            widget(doc, 'tp-title', 'theme-post-title', { header_size: 'h1', align: 'right', title_color: C.navy, typography_typography: 'custom', typography_font_family: 'Neirizi', typography_font_size: { unit: 'px', size: 34, sizes: [] } }, { title: 'H1 — عنوان موضوع', cls: 'az-dynamic-title' }),
            container(doc, 'tp-progress', [shortcodeWidget(doc, 'tp-progress-sc', sc('learndash_course_progress'), { title: 'پیشرفت دوره' })], { title: 'پیشرفت', cls: 'az-mount', g: 0 }),
          ],
          { title: 'سربرگ موضوع', cls: 'az-stack', g: 12 }
        ),
      ],
      { title: 'Topic — سربرگ', cls: 'az-section az-section--tight', innerCls: 'az-wrap az-topic-wrap', bg: C.surface }
    ),
    section(
      doc,
      'tp-body',
      [
        container(
          doc,
          'tp-main',
          [
            container(
              doc,
              'tp-content',
              [
                widget(doc, 'tp-content-widget', 'theme-post-content', { text_color: C.text, typography_typography: 'custom', typography_font_family: 'Peyda', typography_font_size: { unit: 'px', size: 16.5, sizes: [] }, typography_line_height: { unit: 'em', size: 2, sizes: [] } }, { title: 'محتوای موضوع (داینامیک)', cls: 'az-mount az-dynamic-content' }),
              ],
              { title: 'محتوای موضوع', cls: 'az-card', g: 0, bg: C.surface, radius: edge(22), border: { color: C.line }, padding: { unit: 'px', top: '26', right: '26', bottom: '26', left: '26', isLinked: false } }
            ),
            container(doc, 'tp-nav', [button(doc, 'tp-next', `${UI.nextLesson} ›`, '#', { variant: 'primary', block: true, title: 'CTA — مورد بعدی' })], { title: 'ناوبری', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 10 }),
          ],
          { title: 'ستون موضوع', cls: 'az-stack', g: 16 }
        ),
      ],
      { title: 'Topic — بدنه', cls: 'az-section', innerCls: 'az-wrap az-narrow' }
    ),
  ];
}

/* ================================================================== QUIZ */
function quizBuild(doc) {
  return [
    section(
      doc,
      'qz-hero',
      [
        breadcrumbs(doc, 'qz', [{ label: 'خانه', url: '/' }, { label: 'دوره‌ها', url: '/courses' }, { label: 'نام دوره', url: '#' }, { label: 'آزمون', url: '#' }]),
        container(
          doc,
          'qz-head',
          [
            kicker(doc, 'qz-kicker', 'آزمون'),
            widget(doc, 'qz-title', 'theme-post-title', { header_size: 'h1', align: 'right', title_color: C.navy, typography_typography: 'custom', typography_font_family: 'Neirizi', typography_font_size: { unit: 'px', size: 34, sizes: [] } }, { title: 'H1 — عنوان آزمون', cls: 'az-dynamic-title' }),
            metaRow(doc, 'qz', ['REPLACE: تعداد پرسش', 'REPLACE: زمان', 'REPLACE: نمرهٔ قبولی'], { title: 'متادادهٔ آزمون' }),
          ],
          { title: 'سربرگ آزمون', cls: 'az-stack', g: 12 }
        ),
      ],
      { title: 'Quiz — سربرگ', cls: 'az-section az-section--tight', innerCls: 'az-wrap az-quiz-wrap', bg: C.surface }
    ),
    section(
      doc,
      'qz-body',
      [
        container(
          doc,
          'qz-mount',
          [shortcodeWidget(doc, 'qz-mount-sc', sc('course_content'), { title: 'آزمون LearnDash' })],
          { title: 'بدنهٔ آزمون', cls: 'az-mount az-quiz-mount', g: 0, bg: C.surface, radius: edge(22), border: { color: C.line }, padding: { unit: 'px', top: '24', right: '24', bottom: '24', left: '24', isLinked: false } }
        ),
        paragraph(doc, 'qz-note', 'وضعیت‌های پرسش، ارسال، قبولی، مردودی و تلاش دوباره توسط LearnDash رندر می‌شوند و با CSS این قالب هم‌نوا شده‌اند.', { size: 13, color: C.muted, cls: 'az-form-note' }),
        grid(
          doc,
          'qz-states',
          [
            stateBlock(doc, 'qz-pass', { tone: 'success', icon: 'fas fa-inbox', title: 'قبولی', body: 'آزمون با نمرهٔ بالاتر از حد نصاب پاس شده و درس بعدی باز می‌شود.', navTitle: 'وضعیت — قبولی' }),
            stateBlock(doc, 'qz-fail', { tone: 'danger', icon: 'fas fa-inbox', title: 'مردودی', body: 'نمره کمتر از حد نصاب است؛ می‌توانید طبق تنظیمات دوره دوباره تلاش کنید.', actions: [{ label: 'تلاش دوباره', url: '#' }], navTitle: 'وضعیت — مردودی' }),
          ],
          { cols: 2, tablet: 2, mobile: 1, title: 'وضعیت‌های آزمون', cls: 'az-grid az-grid--2' }
        ),
      ],
      { title: 'Quiz — بدنه', cls: 'az-section', innerCls: 'az-wrap az-narrow' }
    ),
  ];
}

/* ========================================================= COURSE PLAYER */
function enrolledCourseBuild(doc) {
  return [
    section(
      doc,
      'pl-hero',
      [
        breadcrumbs(doc, 'pl', [{ label: 'خانه', url: '/' }, { label: 'دوره‌های من', url: '/dashboard/courses' }, { label: 'نام دوره', url: '#' }]),
        container(
          doc,
          'pl-head',
          [
            heading(doc, 'pl-title', 'در حال یادگیری', { level: 'h1', title: 'H1 — عنوان دوره' }),
            container(doc, 'pl-progress', [shortcodeWidget(doc, 'pl-progress-sc', sc('learndash_course_progress'), { title: 'پیشرفت واقعی' })], { title: 'پیشرفت', cls: 'az-mount', g: 0 }),
          ],
          { title: 'سربرگ پلیر', cls: 'az-stack', g: 12 }
        ),
      ],
      { title: 'Player — سربرگ', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'pl-body',
      [
        container(
          doc,
          'pl-grid',
          [
            container(
              doc,
              'pl-main',
              [
                container(doc, 'pl-video', [videoSlot(doc, 'pl-video-widget', { title: 'ویدیوی درس', overlayNote: 'درس جاری', cls: 'az-video az-lesson-video' })], { title: 'رسانهٔ درس', cls: 'az-lesson-media', g: 0, radius: edge(20), overflow: 'hidden', bg: C.dark }),
                container(
                  doc,
                  'pl-content',
                  [
                    heading(doc, 'pl-content-title', 'درس جاری', { level: 'h2', title: 'H2 — درس جاری' }),
                    widget(doc, 'pl-content-widget', 'theme-post-content', { text_color: C.text, typography_typography: 'custom', typography_font_family: 'Peyda', typography_font_size: { unit: 'px', size: 16.5, sizes: [] }, typography_line_height: { unit: 'em', size: 2, sizes: [] } }, { title: 'محتوای درس', cls: 'az-mount az-dynamic-content' }),
                  ],
                  { title: 'محتوای درس', cls: 'az-card az-stack', g: 12 }
                ),
                container(
                  doc,
                  'pl-actions',
                  [
                    button(doc, 'pl-complete', UI.markComplete, '#', { variant: 'primary', block: true, title: 'CTA — اتمام درس' }),
                    button(doc, 'pl-next', `${UI.nextLesson} ›`, '#', { variant: 'outline', block: true, title: 'CTA — درس بعدی' }),
                  ],
                  { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }
                ),
              ],
              { title: 'ستون محتوا', cls: 'az-stack', g: 18 }
            ),
            container(
              doc,
              'pl-side',
              [
                container(
                  doc,
                  'pl-nav-card',
                  [
                    heading(doc, 'pl-nav-title', 'درس‌های دوره', { level: 'h3', title: 'H3 — فهرست درس‌ها' }),
                    container(doc, 'pl-nav-mount', [shortcodeWidget(doc, 'pl-nav-sc', sc('az_course_curriculum'), { title: 'فهرست درس‌ها (داینامیک)' })], { title: 'فهرست درس‌ها', cls: 'az-mount', g: 0 }),
                    container(
                      doc,
                      'pl-nav-sample',
                      [
                        { t: 'جلسهٔ ۱ — آشنایی', s: 'done' },
                        { t: 'جلسهٔ ۲ — آماده‌سازی', s: 'done' },
                        { t: 'جلسهٔ ۳ — اجرا', s: 'current' },
                        { t: 'جلسهٔ ۴ — کنترل', s: 'locked' },
                      ].map((item, i) =>
                        container(
                          doc,
                          `pl-nav-item-${i}`,
                          [
                            container(doc, `pl-nav-n-${i}`, [paragraph(doc, `pl-nav-nt-${i}`, item.s === 'locked' ? '🔒' : item.s === 'done' ? '✓' : toPersianNum(i + 1), { align: 'center', size: 13, weight: '700', color: item.s === 'locked' ? C.muted : C.navy, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], { title: `نشان ${i + 1}`, cls: 'az-ld-item__n', g: 0, align: 'center', justify: 'center', bg: item.s === 'locked' ? C.surfaceAlt : item.s === 'current' ? C.teal : C.cream }),
                            paragraph(doc, `pl-nav-t-${i}`, item.t, { size: 14.5, weight: item.s === 'current' ? '700' : '600', color: item.s === 'locked' ? C.muted : C.navy, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }),
                          ],
                          { title: `درس ${i + 1}`, cls: `az-ld-item${item.s === 'locked' ? ' az-ld-item--locked' : ''}${item.s === 'current' ? ' az-ld-item--current' : ''}`, direction: 'row', g: 10, align: 'center' }
                        )
                      ),
                      { title: 'نمونهٔ فهرست درس‌ها', cls: 'az-ld-list', g: 8 }
                    ),
                  ],
                  { title: 'کارت ناوبری دوره', cls: 'az-card az-stack', g: 12 }
                ),
                container(
                  doc,
                  'pl-res',
                  [
                    heading(doc, 'pl-res-title', 'منابع درس', { level: 'h4', title: 'H4 — منابع' }),
                    iconList(doc, 'pl-res-list', ['REPLACE: فایل تمرین', 'REPLACE: نقشه'], { title: 'منابع', size: 13 }),
                    button(doc, 'pl-res-btn', UI.download, '#', { variant: 'ghost', block: true, size: 'sm', title: 'CTA — دانلود منابع' }),
                  ],
                  { title: 'کارت منابع', cls: 'az-card az-stack', g: 8 }
                ),
                container(
                  doc,
                  'pl-assign',
                  [
                    heading(doc, 'pl-assign-title', 'تکلیف این مرحله', { level: 'h4', title: 'H4 — تکلیف' }),
                    paragraph(doc, 'pl-assign-body', 'خروجی تمرین این مرحله را بارگذاری کنید تا مدرس بررسی کند.', { size: 13.5, color: C.muted }),
                    button(doc, 'pl-assign-btn', 'ارسال تکلیف', '/dashboard/assignments', { variant: 'accent', block: true, size: 'sm', title: 'CTA — ارسال تکلیف' }),
                  ],
                  { title: 'کارت تکلیف', cls: 'az-card az-card--cream az-stack', g: 8 }
                ),
              ],
              { title: 'ستون ناوبری دوره', cls: 'az-rail az-stack', g: 14, sticky: 'top', customCss: `selector{ top:96px; }\n@media (max-width:860px){ selector{ position:static; top:auto; } }` }
            ),
          ],
          {
            title: 'شبکهٔ پلیر',
            cls: 'az-split az-player-grid',
            direction: 'row',
            wrap: 'wrap',
            g: 26,
            align: 'start',
            responsive: { mobile: { flex_direction: 'column' } },
            customCss: `@media (max-width:860px){ selector > .elementor-element:last-child{ order:-1; } }`,
          }
        ),
      ],
      { title: 'Player — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
  ];
}

/* ============================================================ PATHS */
function pathsBuild(doc) {
  return [
    pageHero(doc, 'paths-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'مسیرهای یادگیری', url: '/learning-paths' }],
      kicker: 'مسیر یادگیری',
      title: 'چند دوره، یک هدف مشخص',
      lead: 'هر مسیر چند دوره را به ترتیب می‌چیند تا از سطح فعلی به یک خروجی حرفه‌ای برسید.',
      meta: ['توالی مشخص', 'خروجی مرحله‌ای', 'بستهٔ اقتصادی‌تر'],
      navTitle: 'Paths — سربرگ',
    }),
    section(
      doc,
      'paths-how',
      [
        sectionHead(doc, 'paths-how', { title: 'مسیر یادگیری چه فرقی با دوره دارد؟', lead: 'دوره یک مهارت را آموزش می‌دهد؛ مسیر چند مهارت را برای رسیدن به یک هدف کنار هم می‌گذارد.' }),
        grid(
          doc,
          'paths-how-grid',
          [
            card(doc, 'paths-h1', { navTitle: 'تفاوت — ترتیب', icon: { value: 'fas fa-list-ol', library: 'fa-solid' }, title: 'ترتیب مشخص', lead: 'دوره‌ها به ترتیبی چیده شده‌اند که هر مرحله پیش‌نیاز مرحلهٔ بعد باشد.' }),
            card(doc, 'paths-h2', { navTitle: 'تفاوت — هدف', icon: { value: 'fas fa-bullseye', library: 'fa-solid' }, title: 'هدف نهایی روشن', lead: 'پایان هر مسیر یک خروجی مشخص دارد، نه مجموعه‌ای از درس‌های پراکنده.' }),
            card(doc, 'paths-h3', { navTitle: 'تفاوت — هزینه', icon: { value: 'fas fa-tags', library: 'fa-solid' }, title: 'صرفه‌جویی در هزینه', lead: 'خرید یک‌جای مسیر معمولاً کمتر از خرید تک‌تک دوره‌هاست. REPLACE: در صورت واقعی‌بودن تخفیف.' }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'تفاوت‌ها', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Paths — تفاوت', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'paths-list',
      [
        container(doc, 'paths-mount', [shortcodeWidget(doc, 'paths-mount-sc', sc('az_path_courses'), { title: 'فهرست داینامیک مسیرها' })], { title: 'مسیرها (داینامیک)', cls: 'az-mount', g: 0 }),
        sectionHead(doc, 'paths-list', { title: 'مسیرهای موجود', lead: 'هر مسیر را باز کنید تا توالی دوره‌ها و خروجی نهایی را ببینید.' }),
        grid(doc, 'paths-grid', PATHS.map((p, i) => pathCard(doc, `paths-${i}`, p)), { cols: 3, tablet: 2, mobile: 1, title: 'فهرست مسیرها', cls: 'az-grid az-grid--3' }),
      ],
      { title: 'Paths — فهرست', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    faqBlock(doc, 'paths-faq', FAQ.courses, { title: 'پرسش‌های مسیرها', navTitle: 'Paths — پرسش‌ها' }),
    ctaBand(doc, 'paths-cta', { title: 'مردد هستید کدام مسیر مناسب است؟', body: 'از صفحهٔ راهنما شروع کنید یا مستقیم بپرسید.', primary: { label: 'از کجا شروع کنم؟', url: '/start-here' }, navTitle: 'Paths — دعوت به اقدام' }),
  ];
}

function singlePathBuild(doc) {
  const sampleCourse = COURSES[0];
  return [
    section(
      doc,
      'sp-hero',
      [
        breadcrumbs(doc, 'sp', [{ label: 'خانه', url: '/' }, { label: 'مسیرهای یادگیری', url: '/learning-paths' }, { label: 'نام مسیر', url: '#' }]),
        container(
          doc,
          'sp-hero-grid',
          [
            container(
              doc,
              'sp-hero-copy',
              [
                kicker(doc, 'sp-kicker', 'مسیر یادگیری'),
                widget(doc, 'sp-title', 'theme-post-title', { header_size: 'h1', align: 'right', title_color: C.navy, typography_typography: 'custom', typography_font_family: 'Neirizi', typography_font_size: { unit: 'px', size: 44, sizes: [] } }, { title: 'H1 — عنوان مسیر (داینامیک)', cls: 'az-dynamic-title' }),
                widget(doc, 'sp-excerpt', 'theme-post-excerpt', { text_color: C.muted, typography_typography: 'custom', typography_font_family: 'Peyda', typography_font_size: { unit: 'px', size: 16.5, sizes: [] } }, { title: 'خلاصهٔ مسیر (داینامیک)', cls: 'az-dynamic-excerpt' }),
                container(doc, 'sp-meta', [shortcodeWidget(doc, 'sp-meta-sc', sc('az_path_courses'), { title: 'متادادهٔ مسیر' })], { title: 'متادادهٔ داینامیک', cls: 'az-mount', g: 0 }),
                metaRow(doc, 'sp', ['REPLACE: تعداد مراحل', 'REPLACE: تعداد دوره', 'REPLACE: مدت کل'], { title: 'متادادهٔ نمونه' }),
              ],
              { title: 'متن Hero', cls: 'az-stack', g: 14 }
            ),
            container(doc, 'sp-hero-media', [mediaFrame(doc, 'sp-frame', { label: 'نمودار مسیر', note: 'جای تصویر', ratio: '4 / 3', title: 'قاب تصویر مسیر' })], { title: 'تصویر مسیر', cls: 'az-hero__visual', g: 0 }),
          ],
          { title: 'شبکهٔ Hero', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 30, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Path — Hero', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),

    section(
      doc,
      'sp-sequence',
      [
        sectionHead(doc, 'sp-sequence', { title: 'توالی دوره‌های این مسیر', lead: 'دوره‌ها به همین ترتیب پیش می‌روند.' }),
        container(doc, 'sp-seq-mount', [shortcodeWidget(doc, 'sp-seq-sc', sc('az_path_courses'), { title: 'توالی داینامیک دوره‌ها' })], { title: 'توالی داینامیک', cls: 'az-mount', g: 0 }),
        container(
          doc,
          'sp-seq-list',
          COURSES.slice(0, 3).map((c, i) =>
            container(
              doc,
              `sp-seq-${i}`,
              [
                container(doc, `sp-seq-n-${i}`, [paragraph(doc, `sp-seq-nt-${i}`, toPersianNum(i + 1), { align: 'center', size: 16, weight: '700', color: '#FFF3E1', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], { title: `شمارهٔ مرحله ${i + 1}`, cls: 'az-step__n', g: 0, align: 'center', justify: 'center', bg: C.navy, radius: edge(14) }),
                container(doc, `sp-seq-b-${i}`, [heading(doc, `sp-seq-t-${i}`, c.title, { level: 'h4', title: `H4 — ${c.title}` }), paragraph(doc, `sp-seq-d-${i}`, c.excerpt, { size: 14.5, color: C.muted })], { title: `متن مرحله ${i + 1}`, cls: 'az-step__body', g: 4 }),
              ],
              { title: `مرحله ${i + 1}`, cls: 'az-step', direction: 'row', g: 16 }
            )
          ),
          { title: 'توالی نمونه', cls: 'az-steps', g: 0 }
        ),
      ],
      { title: 'Path — توالی', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    section(
      doc,
      'sp-details',
      [
        container(
          doc,
          'sp-details-grid',
          [
            container(
              doc,
              'sp-outcomes',
              [
                heading(doc, 'sp-out-title', 'خروجی این مسیر', { level: 'h2', title: 'H2 — خروجی مسیر' }),
                iconList(doc, 'sp-out-list', ['تسلط عملی بر مراحل اصلی', 'توانایی اجرای مستقل یک قطعه', 'آمادگی برای پروژه‌های سفارشی'], { title: 'خروجی‌ها' }),
              ],
              { title: 'بخش — خروجی', cls: 'az-card az-stack', g: 12 }
            ),
            container(
              doc,
              'sp-summary',
              [
                heading(doc, 'sp-sum-title', 'خلاصهٔ مسیر', { level: 'h2', title: 'H2 — خلاصهٔ مسیر' }),
                container(
                  doc,
                  'sp-sum-rows',
                  [
                    ['تعداد دوره‌ها', 'REPLACE: ۳'],
                    ['مدت کل', 'REPLACE: ۴ ماه'],
                    ['تعداد جلسات', 'REPLACE: ۴۲ جلسه'],
                    ['قیمت بسته', 'REPLACE: مبلغ'],
                    ['صرفه‌جویی', 'REPLACE: در صورت واقعی‌بودن'],
                  ].map(([k, v], i) =>
                    container(
                      doc,
                      `sp-sum-${i}`,
                      [
                        paragraph(doc, `sp-sum-k-${i}`, k, { size: 14, color: C.muted, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }),
                        paragraph(doc, `sp-sum-v-${i}`, v, { size: 15, weight: '700', color: C.navy, align: 'left', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }),
                      ],
                      { title: `ردیف ${k}`, cls: 'az-summary-row', direction: 'row', justify: 'space-between', align: 'center', g: 10 }
                    )
                  ),
                  { title: 'ردیف‌های خلاصه', cls: 'az-stack', g: 10 }
                ),
                button(doc, 'sp-cta', 'شروع این مسیر', '#', { variant: 'accent', block: true, title: 'CTA — شروع مسیر' }),
                paragraph(doc, 'sp-note', 'REPLACE: شرایط خرید بسته و نحوهٔ دسترسی به همهٔ دوره‌ها پس از پرداخت.', { size: 13, color: C.muted, cls: 'az-form-note' }),
              ],
              {
                title: 'بخش — خلاصه و خرید',
                cls: 'az-rail az-card',
                g: 14,
                sticky: 'top',
                customCss: `selector{ top:96px; }\n@media (max-width:860px){ selector{ position:static; top:auto; } }`,
              }
            ),
          ],
          { title: 'شبکهٔ جزئیات مسیر', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 26, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Path — جزئیات', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),

    section(
      doc,
      'sp-instructors',
      [
        sectionHead(doc, 'sp-instructors', { title: 'مدرسان این مسیر' }),
        grid(doc, 'sp-ins-grid', INSTRUCTORS.slice(0, 3).map((ins, i) => instructorCard(doc, `sp-ins-${i}`, ins)), { cols: 3, tablet: 2, mobile: 1, title: 'مدرسان', cls: 'az-grid az-grid--3' }),
      ],
      { title: 'Path — مدرسان', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    faqBlock(doc, 'sp-faq', FAQ.courses, { title: 'پرسش‌های این مسیر', navTitle: 'Path — پرسش‌ها' }),
  ];
}

/* ============================================================ WORKSHOPS */
function workshopsBuild(doc) {
  return [
    pageHero(doc, 'ws-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'کلاس‌های حضوری', url: '/workshops' }],
      kicker: 'کلاس حضوری',
      title: 'کلاس‌های حضوری کارگاه',
      lead: 'ظرفیت هر کلاس محدود است تا هر هنرجو دار و ابزار خودش را داشته باشد. ثبت‌نام به ترتیب پرداخت قطعی می‌شود.',
      meta: ['ظرفیت محدود', 'ابزار در کارگاه', 'برنامهٔ زمان‌بندی‌شده'],
      actions: [{ label: 'راهنمای ثبت‌نام', url: '/start-here', variant: 'outline' }],
      navTitle: 'Workshops — سربرگ',
    }),
    section(
      doc,
      'ws-how',
      [
        sectionHead(doc, 'ws-how', { title: 'ثبت‌نام چگونه انجام می‌شود؟', lead: 'چهار مرحله تا نشستن پشت دار.' }),
        roadmap(doc, 'ws-how', [
          { title: 'انتخاب کلاس', body: 'برنامهٔ زمانی، سطح و ظرفیت باقی‌مانده را در صفحهٔ هر کلاس ببینید.' },
          { title: 'پرداخت آنلاین', body: 'ثبت‌نام با پرداخت قطعی می‌شود و ظرفیت شما رزرو می‌گردد.' },
          { title: 'دریافت برنامه', body: 'نشانی سالن و فهرست وسایل مورد نیاز پیش از شروع ارسال می‌شود.' },
          { title: 'حضور در کارگاه', body: 'هر جلسه خروجی عملی دارد و تمرین‌ها در کارگاه ادامه پیدا می‌کند.' },
        ], { showHead: false, navTitle: 'Workshops — مراحل' }),
      ],
      { title: 'Workshops — نحوهٔ ثبت‌نام', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'ws-list',
      [
        sectionHead(doc, 'ws-list', { title: 'کلاس‌های پیش‌رو', link: { label: 'راهنمای انتخاب', url: '/start-here' } }),
        container(doc, 'ws-mount', [shortcodeWidget(doc, 'ws-mount-sc', sc('products', { limit: 9, columns: 3, category: 'workshop', orderby: 'date' }), { title: 'کلاس‌ها از ووکامرس (دستهٔ workshop)' })], { title: 'کلاس‌ها (داینامیک)', cls: 'az-mount', g: 0 }),
        grid(doc, 'ws-fallback', WORKSHOPS.map((w, i) => workshopCard(doc, `ws-f-${i}`, w)), { cols: 3, tablet: 2, mobile: 1, title: 'کلاس‌ها (نمونه)', cls: 'az-grid az-grid--3' }),
      ],
      { title: 'Workshops — فهرست', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    section(
      doc,
      'ws-space',
      [
        container(
          doc,
          'ws-space-grid',
          [
            container(
              doc,
              'ws-space-copy',
              [
                kicker(doc, 'ws-space-kicker', 'فضای کارگاه'),
                heading(doc, 'ws-space-title', 'دار، ابزار و نور کافی برای هر هنرجو', { level: 'h2', title: 'H2 — فضای کارگاه' }),
                paragraph(doc, 'ws-space-body', 'REPLACE: توصیف فضای کارگاه — تعداد دار، نور، تهویه، بخش رنگرزی و فضای استراحت.', { size: 16, color: C.muted }),
                iconList(doc, 'ws-space-list', ['دار و ابزار پایه در کارگاه', 'بخش مجزای رنگرزی', 'فضای نگه‌داری قطعات'], { title: 'امکانات' }),
              ],
              { title: 'متن فضا', cls: 'az-stack', g: 14 }
            ),
            container(
              doc,
              'ws-space-media',
              [
                container(doc, 'ws-gal', [0, 1, 2, 3].map((i) => mediaFrame(doc, `ws-g-${i}`, { label: 'کارگاه', note: `نگارهٔ ${toPersianNum(i + 1)}`, ratio: '1 / 1', title: `قاب کارگاه ${i + 1}` })), { title: 'گالری کارگاه', cls: 'az-gallery', direction: 'row', wrap: 'wrap', g: 12 }),
              ],
              { title: 'تصاویر فضا', cls: 'az-stack', g: 0 }
            ),
          ],
          { title: 'شبکهٔ فضا', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 30, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Workshops — فضا', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
    faqBlock(doc, 'ws-faq', FAQ.workshops, { title: 'پرسش‌های کلاس حضوری', navTitle: 'Workshops — پرسش‌ها' }),
    ctaBand(doc, 'ws-cta', { title: 'ظرفیت‌ها محدود است', body: 'برای اطلاع از نوبت بعدی، با کارگاه در تماس باشید.', primary: { label: 'تماس با کارگاه', url: '/contact' }, navTitle: 'Workshops — دعوت به اقدام' }),
  ];
}

function singleWorkshopBuild(doc) {
  return [
    section(
      doc,
      'w1-hero',
      [
        breadcrumbs(doc, 'w1', [{ label: 'خانه', url: '/' }, { label: 'کلاس‌های حضوری', url: '/workshops' }, { label: 'نام کلاس', url: '#' }]),
        container(
          doc,
          'w1-hero-grid',
          [
            container(
              doc,
              'w1-media',
              [
                widget(doc, 'w1-images', 'woocommerce-product-images', {}, { title: 'تصاویر کلاس (ووکامرس)', cls: 'az-woo-widget az-woo-images' }),
                mediaFrame(doc, 'w1-frame', { label: 'کلاس حضوری', note: 'جای تصویر کلاس', ratio: '4 / 3', title: 'قاب تصویر کلاس' }),
              ],
              { title: 'رسانهٔ کلاس', cls: 'az-stack', g: 12 }
            ),
            container(
              doc,
              'w1-copy',
              [
                kicker(doc, 'w1-kicker', 'کلاس حضوری', { cls: 'az-kicker az-kicker--red' }),
                widget(doc, 'w1-title', 'theme-post-title', { header_size: 'h1', align: 'right', title_color: C.navy, typography_typography: 'custom', typography_font_family: 'Neirizi', typography_font_size: { unit: 'px', size: 40, sizes: [] } }, { title: 'H1 — عنوان کلاس', cls: 'az-dynamic-title' }),
                container(
                  doc,
                  'w1-meta-mount',
                  [shortcodeWidget(doc, 'w1-meta-sc', sc('az_workshop_meta', { field: 'schedule' }), { title: 'برنامهٔ واقعی کلاس' })],
                  { title: 'برنامهٔ داینامیک', cls: 'az-mount', g: 0 }
                ),
                metaRow(doc, 'w1', ['REPLACE: تاریخ شروع', 'REPLACE: روزها و ساعت', 'REPLACE: تعداد جلسات', 'REPLACE: مدرس'], { title: 'برنامهٔ کلاس' }),
                container(
                  doc,
                  'w1-capacity',
                  [
                    container(doc, 'w1-cap-mount', [shortcodeWidget(doc, 'w1-cap-sc', sc('az_workshop_meta', { field: 'seats' }), { title: 'ظرفیت واقعی (موجودی محصول)' })], { title: 'ظرفیت داینامیک', cls: 'az-mount', g: 0 }),
                    metaRow(doc, 'w1-cap', ['REPLACE: ظرفیت باقی‌مانده'], { title: 'ظرفیت', badge: true, cls: 'az-capacity' }),
                  ],
                  { title: 'ظرفیت', cls: 'az-stack', g: 8 }
                ),
                container(
                  doc,
                  'w1-buy',
                  [
                    container(doc, 'w1-price', [widget(doc, 'w1-price-w', 'woocommerce-product-price', {}, { title: 'قیمت (ووکامرس)', cls: 'az-woo-widget az-woo-price' })], { title: 'قیمت', cls: 'az-mount', g: 0 }),
                    container(doc, 'w1-add', [widget(doc, 'w1-add-w', 'woocommerce-product-add-to-cart', {}, { title: 'افزودن به سبد (ووکامرس)', cls: 'az-woo-widget az-woo-add' })], { title: 'افزودن به سبد', cls: 'az-mount', g: 0 }),
                    paragraph(doc, 'w1-installment', 'REPLACE: شرایط اقساط در صورت پشتیبانی درگاه پرداخت.', { size: 13, color: C.muted, cls: 'az-form-note' }),
                  ],
                  { title: 'خرید', cls: 'az-card az-stack', g: 12, bg: C.surface, border: { color: C.line }, radius: edge(20), padding: { unit: 'px', top: '18', right: '18', bottom: '18', left: '18', isLinked: false } }
                ),
              ],
              { title: 'متن کلاس', cls: 'az-stack', g: 14 }
            ),
          ],
          { title: 'شبکهٔ Hero', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 30, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Workshop — Hero', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'w1-body',
      [
        container(
          doc,
          'w1-tabs',
          [widget(doc, 'w1-tabs-w', 'woocommerce-product-data-tabs', {}, { title: 'توضیحات و مشخصات محصول', cls: 'az-woo-widget az-woo-tabs' })],
          { title: 'تب‌های محصول', cls: 'az-mount az-card', g: 0, bg: C.surface, border: { color: C.line }, radius: edge(22), padding: { unit: 'px', top: '20', right: '20', bottom: '20', left: '20', isLinked: false } }
        ),
        grid(
          doc,
          'w1-details',
          [
            container(
              doc,
              'w1-curriculum',
              [
                heading(doc, 'w1-cur-title', 'برنامهٔ جلسات', { level: 'h2', title: 'H2 — برنامهٔ جلسات' }),
                container(
                  doc,
                  'w1-cur-list',
                  [
                    { t: 'جلسهٔ ۱ — آشنایی و آماده‌سازی', d: 'REPLACE: توضیح کوتاه جلسه' },
                    { t: 'جلسهٔ ۲ — اجرای بخش اصلی', d: 'REPLACE: توضیح کوتاه جلسه' },
                    { t: 'جلسهٔ ۳ — اصلاح و تکمیل', d: 'REPLACE: توضیح کوتاه جلسه' },
                  ].map((s, i) =>
                    container(doc, `w1-c-${i}`, [paragraph(doc, `w1-ct-${i}`, s.t, { size: 15, weight: '700', color: C.navy, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }), paragraph(doc, `w1-cd-${i}`, s.d, { size: 14, color: C.muted, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], { title: `جلسه ${i + 1}`, cls: 'az-card az-card--flat az-cur-item', g: 4 })
                  ),
                  { title: 'فهرست جلسات', cls: 'az-stack', g: 10 }
                ),
              ],
              { title: 'ستون — برنامه', cls: 'az-stack', g: 14 }
            ),
            container(
              doc,
              'w1-side',
              [
                container(
                  doc,
                  'w1-includes',
                  [
                    heading(doc, 'w1-inc-title', 'شامل چه چیزهایی است', { level: 'h3', title: 'H3 — شامل' }),
                    iconList(doc, 'w1-inc-list', ['ابزار و دار در کارگاه', 'مواد پایهٔ تمرین', 'بررسی حضوری توسط مدرس'], { title: 'موارد شامل', size: 14 }),
                  ],
                  { title: 'کارت — شامل', cls: 'az-card az-stack', g: 10 }
                ),
                container(
                  doc,
                  'w1-materials',
                  [
                    heading(doc, 'w1-mat-title', 'وسایل مورد نیاز', { level: 'h3', title: 'H3 — وسایل' }),
                    iconList(doc, 'w1-mat-list', ['REPLACE: پیش‌بند و کفش راحت', 'REPLACE: دفترچهٔ یادداشت'], { title: 'وسایل', size: 14 }),
                  ],
                  { title: 'کارت — وسایل', cls: 'az-card az-card--cream az-stack', g: 10 }
                ),
                container(
                  doc,
                  'w1-location',
                  [
                    heading(doc, 'w1-loc-title', 'محل برگزاری', { level: 'h3', title: 'H3 — محل برگزاری' }),
                    paragraph(doc, 'w1-loc-text', 'REPLACE: نشانی دقیق سالن و نزدیک‌ترین نشانی شاخص.', { size: 14.5 }),
                    button(doc, 'w1-loc-btn', 'مسیر روی نقشه', '#', { variant: 'outline', block: true, size: 'sm', title: 'CTA — مسیر روی نقشه' }),
                  ],
                  { title: 'کارت — محل', cls: 'az-card az-stack', g: 10 }
                ),
              ],
              { title: 'ستون کناری کلاس', cls: 'az-stack', g: 14 }
            ),
          ],
          { cols: 2, tablet: 2, mobile: 1, title: 'جزئیات کلاس', cls: 'az-grid az-grid--2' }
        ),
      ],
      { title: 'Workshop — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    faqBlock(doc, 'w1-faq', FAQ.workshops, { title: 'پرسش‌های این کلاس', navTitle: 'Workshop — پرسش‌ها' }),
    section(
      doc,
      'w1-related',
      [
        container(doc, 'w1-related-mount', [widget(doc, 'w1-related-w', 'woocommerce-product-related', {}, { title: 'کلاس‌های مرتبط', cls: 'az-woo-widget' })], { title: 'کلاس‌های مرتبط', cls: 'az-mount', g: 0 }),
      ],
      { title: 'Workshop — مرتبط', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),
  ];
}

/* =============================================================== SHOP */
function shopBuild(doc) {
  return [
    pageHero(doc, 'sh-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'فروشگاه', url: '/shop' }],
      kicker: 'فروشگاه',
      title: 'ابزار، مواد و آثار',
      lead: 'وسایل مورد نیاز کلاس‌ها و قطعات ساخته‌شده در کارگاه.',
      navTitle: 'Shop — سربرگ',
    }),
    section(
      doc,
      'sh-cats',
      [
        htmlBlock(
          doc,
          'sh-cats-html',
          `<div class="az-filter-row" dir="rtl">
  <span class="az-filter-label">دسته‌ها:</span>
  <a class="az-badge" href="/shop">همه</a>
  <a class="az-badge" href="/product-category/workshop">کلاس‌های حضوری</a>
  <a class="az-badge" href="/product-category/tools">ابزار</a>
  <a class="az-badge" href="/product-category/materials">مواد اولیه</a>
  <a class="az-badge" href="/product-category/artworks">آثار</a>
</div>`,
          { title: 'دسته‌های فروشگاه', cls: 'az-filter-row-wrap' }
        ),
      ],
      { title: 'Shop — دسته‌ها', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'sh-grid',
      [
        container(doc, 'sh-mount', [widget(doc, 'sh-archive-w', 'woocommerce-archive-products', { columns: '4', columns_tablet: '2', columns_mobile: '1', paginate: 'yes', allow_order: 'yes', show_result_count: 'yes' }, { title: 'محصولات فروشگاه (ووکامرس)', cls: 'az-woo-widget az-woo-archive' })], { title: 'گرید محصولات', cls: 'az-mount az-woo', g: 0 }),
        container(doc, 'sh-mount-alt', [shortcodeWidget(doc, 'sh-alt', sc('products', { limit: 12, columns: 4, paginate: 'true' }), { title: 'جایگزین شورتکد محصولات' })], { title: 'جایگزین شورتکد', cls: 'az-mount az-woo', g: 0 }),
      ],
      { title: 'Shop — گرید', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    ctaBand(doc, 'sh-cta', { title: 'برای انتخاب ابزار راهنمایی می‌خواهید؟', body: 'پیش از خرید ابزار، با کارگاه مشورت کنید.', primary: { label: 'تماس با کارگاه', url: '/contact' }, navTitle: 'Shop — دعوت به اقدام' }),
  ];
}

function singleProductBuild(doc) {
  return [
    section(
      doc,
      'pr-hero',
      [
        breadcrumbs(doc, 'pr', [{ label: 'خانه', url: '/' }, { label: 'فروشگاه', url: '/shop' }, { label: 'نام محصول', url: '#' }]),
        container(
          doc,
          'pr-grid',
          [
            container(
              doc,
              'pr-media',
              [widget(doc, 'pr-images', 'woocommerce-product-images', {}, { title: 'گالری محصول', cls: 'az-woo-widget az-woo-images' })],
              { title: 'رسانهٔ محصول', cls: 'az-woo az-product-media', g: 0 }
            ),
            container(
              doc,
              'pr-summary',
              [
                widget(doc, 'pr-title-w', 'woocommerce-product-title', { header_size: 'h1', title_color: C.navy, typography_typography: 'custom', typography_font_family: 'Neirizi', typography_font_size: { unit: 'px', size: 38, sizes: [] } }, { title: 'H1 — عنوان محصول', cls: 'az-woo-widget' }),
                container(doc, 'pr-price', [widget(doc, 'pr-price-w', 'woocommerce-product-price', {}, { title: 'قیمت', cls: 'az-woo-widget' })], { title: 'قیمت', cls: 'az-mount', g: 0 }),
                container(doc, 'pr-rating', [widget(doc, 'pr-rating-w', 'woocommerce-product-rating', {}, { title: 'امتیاز محصول', cls: 'az-woo-widget' })], { title: 'امتیاز', cls: 'az-mount', g: 0 }),
                widget(doc, 'pr-excerpt', 'theme-post-excerpt', { text_color: C.muted, typography_typography: 'custom', typography_font_family: 'Peyda', typography_font_size: { unit: 'px', size: 16, sizes: [] } }, { title: 'توضیح کوتاه محصول', cls: 'az-dynamic-excerpt' }),
                container(doc, 'pr-add', [widget(doc, 'pr-add-w', 'woocommerce-product-add-to-cart', {}, { title: 'افزودن به سبد', cls: 'az-woo-widget' })], { title: 'افزودن به سبد', cls: 'az-mount az-woo', g: 0 }),
                container(doc, 'pr-stock', [widget(doc, 'pr-stock-w', 'woocommerce-product-stock', {}, { title: 'موجودی', cls: 'az-woo-widget' })], { title: 'موجودی', cls: 'az-mount', g: 0 }),
                container(doc, 'pr-meta', [widget(doc, 'pr-meta-w', 'woocommerce-product-meta', {}, { title: 'مشخصات محصول', cls: 'az-woo-widget' })], { title: 'مشخصات', cls: 'az-mount', g: 0 }),
                container(
                  doc,
                  'pr-trust',
                  [
                    iconList(doc, 'pr-trust-list', ['ارسال یا تحویل حضوری (REPLACE)', 'پشتیبانی پیش از خرید (REPLACE)'], { title: 'نکات اعتماد', size: 13 }),
                  ],
                  { title: 'نکات اعتماد', cls: 'az-card az-card--flat az-stack', g: 8 }
                ),
              ],
              { title: 'خلاصهٔ محصول', cls: 'az-stack az-product-summary', g: 14 }
            ),
          ],
          { title: 'شبکهٔ محصول', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 30, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Product — Hero', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'pr-tabs',
      [container(doc, 'pr-tabs-wrap', [widget(doc, 'pr-tabs-w', 'woocommerce-product-data-tabs', {}, { title: 'تب‌های محصول', cls: 'az-woo-widget' })], { title: 'تب‌ها', cls: 'az-mount az-woo az-card', g: 0, bg: C.surface, border: { color: C.line }, radius: edge(22), padding: { unit: 'px', top: '18', right: '18', bottom: '18', left: '18', isLinked: false } })],
      { title: 'Product — تب‌ها', cls: 'az-section az-section--tight', innerCls: 'az-wrap' }
    ),
    section(
      doc,
      'pr-related',
      [container(doc, 'pr-related-wrap', [widget(doc, 'pr-related-w', 'woocommerce-product-related', {}, { title: 'محصولات مرتبط', cls: 'az-woo-widget' })], { title: 'مرتبط', cls: 'az-mount az-woo', g: 0 })],
      { title: 'Product — مرتبط', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),
  ];
}

/* ------------------------------------------------------------- registry */
export function registerLearn() {
  define({ slug: 'courses', title: 'دوره‌های آنلاین — فهرست', docType: 'page', group: 'Learn', page: '/courses', plugins: ['learndash-lms'], dynamic: 'ld_course_list', url: '/courses', condition: '', manual: '', status: 'READY' }, coursesBuild);
  define({ slug: 'single-course', title: 'تک‌دوره — LearnDash', docType: 'single', group: 'Learn', page: 'sfwd-courses', plugins: ['elementor-pro', 'learndash-lms', 'kit-php'], dynamic: 'عنوان/خلاصه/تصویر شاخص + az_course_* ', url: '/courses/{slug}', condition: 'Theme Builder → Single → Courses (sfwd-courses)', manual: 'قیمت، سطح و مدرس از طریق az_course_meta خوانده می‌شود؛ در صورت نبود فیلد، مقادیر REPLACE جایگزین کنید.', status: 'NEEDS CUSTOM BACKEND' }, singleCourseBuild);
  define({ slug: 'lesson', title: 'درس', docType: 'single', group: 'Learn', page: 'sfwd-lessons', plugins: ['elementor-pro', 'learndash-lms', 'kit-php'], dynamic: 'محتوای درس + az_course_curriculum', url: '/lessons/{slug}', condition: 'Theme Builder → Single → Lessons (sfwd-lessons)', manual: '', status: 'NEEDS CUSTOM BACKEND' }, lessonBuild);
  define({ slug: 'topic', title: 'موضوع', docType: 'single', group: 'Learn', page: 'sfwd-topic', plugins: ['elementor-pro', 'learndash-lms'], dynamic: 'محتوای موضوع', url: '/topics/{slug}', condition: 'Theme Builder → Single → Topics (sfwd-topic)', manual: '', status: 'READY' }, topicBuild);
  define({ slug: 'quiz', title: 'آزمون', docType: 'single', group: 'Learn', page: 'sfwd-quiz', plugins: ['elementor-pro', 'learndash-lms'], dynamic: 'آزمون LearnDash', url: '/quiz/{slug}', condition: 'Theme Builder → Single → Quizzes (sfwd-quiz)', manual: '', status: 'READY' }, quizBuild);
  define({ slug: 'enrolled-course', title: 'پخش‌کنندهٔ دوره (در حال یادگیری)', docType: 'page', group: 'Learn', page: '/dashboard/courses/{id}/player', plugins: ['learndash-lms', 'kit-php'], dynamic: 'course_content + az_course_curriculum', url: '/learn/{course}', condition: '', manual: 'این صفحه باید به مسیر یادگیری LearnDash متصل شود.', status: 'NEEDS CUSTOM BACKEND' }, enrolledCourseBuild);
  define({ slug: 'learning-paths', title: 'مسیرهای یادگیری — فهرست', docType: 'page', group: 'Learn', page: '/learning-paths', plugins: ['elementor', 'acf-pro', 'kit-php'], dynamic: 'CPT learning_path', url: '/learning-paths', condition: '', manual: 'در صورت نبود CPT، فهرست ثابت نمایش داده می‌شود.', status: 'READY — NEEDS DYNAMIC BINDING' }, pathsBuild);
  define({ slug: 'learning-path-single', title: 'تک‌مسیر یادگیری', docType: 'single', group: 'Learn', page: 'CPT learning_path', plugins: ['elementor-pro', 'acf-pro', 'kit-php'], dynamic: 'ACF path_courses / outcomes / faq', url: '/learning-paths/{slug}', condition: 'Theme Builder → Single → Learning Path', manual: 'Slugهای فارسی باید با تنظیمات پیوند یکتا (UTF-8) بررسی شوند.', status: 'NEEDS CUSTOM BACKEND' }, singlePathBuild);
  define({ slug: 'workshops', title: 'کلاس‌های حضوری — فهرست', docType: 'page', group: 'Learn', page: '/workshops', plugins: ['woocommerce'], dynamic: 'products category=workshop', url: '/workshops', condition: '', manual: 'دستهٔ محصول با slug دقیق workshop ایجاد شود.', status: 'READY — NEEDS REAL CONTENT' }, workshopsBuild);
  define({ slug: 'class-single', title: 'تک‌کلاس حضوری', docType: 'product', group: 'Learn', page: 'محصول دستهٔ workshop', plugins: ['elementor-pro', 'woocommerce', 'kit-php'], dynamic: 'ویجت‌های ووکامرس + az_workshop_meta', url: '/product/{slug}', condition: 'Theme Builder → Single Product → In Product Category: workshop', manual: 'ظرفیت = موجودی محصول.', status: 'NEEDS CUSTOM BACKEND' }, singleWorkshopBuild);
  define({ slug: 'shop', title: 'فروشگاه', docType: 'product-archive', group: 'Commerce', page: 'آرشیو محصولات', plugins: ['elementor-pro', 'woocommerce'], dynamic: 'woocommerce-archive-products', url: '/shop', condition: 'Theme Builder → Products Archive → All Products', manual: '', status: 'READY' }, shopBuild);
  define({ slug: 'single-product', title: 'تک‌محصول', docType: 'product', group: 'Commerce', page: 'محصولات', plugins: ['elementor-pro', 'woocommerce'], dynamic: 'ویجت‌های ووکامرس', url: '/product/{slug}', condition: 'Theme Builder → Single Product → All Products', manual: 'قالب کلاس حضوری اولویت بالاتری برای دستهٔ workshop دارد.', status: 'READY' }, singleProductBuild);
}
