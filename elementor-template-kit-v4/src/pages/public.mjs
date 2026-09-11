/**
 * Public website pages (spec §12–§20, §30).
 * Doc types are real Elementor document types; LearnDash/Woo conditions are
 * documented per template, never faked into the `type` field (spec §3).
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
  shortcodeWidget,
  htmlBlock,
  divider,
  spacer,
  patternStrip,
  widget,
  searchForm,
  contactForm,
} from '../dom.mjs';
import {
  section,
  hero,
  pageHero,
  sectionHead,
  card,
  courseCard,
  pathCard,
  instructorCard,
  artworkCard,
  mount,
  ctaBand,
  faqBlock,
  roadmap,
  galleryBlock,
  testimonialRow,
  trustStrip,
  contactPanel,
  mapPanel,
  proseBlock,
  stateBlock,
  metaRow,
  breadcrumbs,
  toPersianNum,
} from '../sections/ui.mjs';
import { BRAND, CONTACT, NAV, SOCIAL, TRUST } from '../content/site.mjs';
import { COURSES, PATHS, INSTRUCTORS, ARTWORKS, TESTIMONIALS, ROADMAP, WORKSHOPS } from '../content/catalog.mjs';
import { FAQ, LEGAL, LEGAL_DRAFT_NOTICE, STATES, UI } from '../content/copy.mjs';
import { sc } from '../shortcodes.mjs';
import { define } from '../registry.mjs';

const TB = (what) => `Theme Builder → ${what}`;

/* ================================================================= HOME */
function homeBuild(doc) {
  return [
    hero(doc, 'home-hero', {
      kicker: 'کارگاه آموزش هنرهای بافندگی',
      title: 'فرش، گلیم و رنگ؛ از نخستین گره تا قطعهٔ خودتان',
      lead: 'در آکادمی اسدزاده یادگیری روی دار و کنار مدرس معنا پیدا می‌کند: دورهٔ آنلاین گام‌به‌گام، کلاس حضوری در کارگاه و مسیرهای یادگیری برای کسانی که می‌خواهند از صفر تا اثر مستقل پیش بروند.',
      meta: ['دوره‌های آنلاین', 'کلاس‌های حضوری', 'مسیرهای یادگیری'],
      actions: [
        { label: 'از کجا شروع کنم؟', url: '/start-here', variant: 'primary' },
        { label: 'مشاهدهٔ دوره‌ها', url: '/courses', variant: 'outline' },
      ],
      frameNote: 'قاب تصویر Hero',
      frameSub: 'دار قالی در کارگاه',
      navTitle: 'Home — Hero',
    }),

    trustStrip(doc, 'home-trust', TRUST.items, { title: 'روش کار ما', note: TRUST.note, navTitle: 'Home — نوار اعتماد' }),

    /* ---- where should I start ---- */
    section(
      doc,
      'home-start',
      [
        sectionHead(doc, 'home-start', {
          kicker: 'نقطهٔ شروع',
          title: 'از کجا شروع کنید؟',
          lead: 'سه مسیر ورود دارید. اگر تردید دارید، همین سه گزینه انتخاب را ساده می‌کند.',
        }),
        grid(
          doc,
          'home-start-grid',
          [
            card(doc, 'home-start-1', {
              navTitle: 'کارت — دورهٔ آنلاین',
              icon: { value: 'fas fa-video', library: 'fa-solid' },
              title: 'دورهٔ آنلاین',
              lead: 'یادگیری گام‌به‌گام با بازخورد روی تکالیف؛ مناسب اگر زمان رفت‌وآمد ندارید.',
              bullets: ['دسترسی به محتوای ضبط‌شده', 'بررسی تکلیف توسط مدرس', 'گواهی پایان‌دوره'],
              actions: [{ label: 'دوره‌های آنلاین', url: '/courses' }],
            }),
            card(doc, 'home-start-2', {
              navTitle: 'کارت — مسیر یادگیری',
              icon: { value: 'fas fa-route', library: 'fa-solid' },
              title: 'مسیر یادگیری',
              lead: 'چند دورهٔ پشت‌سرهم با هدف مشخص؛ مناسب اگر می‌خواهید به نتیجهٔ حرفه‌ای برسید.',
              bullets: ['توالی مشخص دوره‌ها', 'هدف‌گذاری مرحله‌ای', 'صرفه‌جویی در هزینهٔ بسته'],
              actions: [{ label: 'مسیرهای یادگیری', url: '/learning-paths' }],
            }),
            card(doc, 'home-start-3', {
              navTitle: 'کارت — کلاس حضوری',
              icon: { value: 'fas fa-hands-holding', library: 'fa-solid' },
              title: 'کلاس حضوری',
              lead: 'کار روی دار در کارگاه، با ابزار در دسترس؛ مناسب اگر یادگیری با دست برایتان بهتر است.',
              bullets: ['ظرفیت محدود', 'ابزار و دار در کارگاه', 'برنامهٔ زمان‌بندی‌شده'],
              actions: [{ label: 'کلاس‌های حضوری', url: '/workshops', variant: 'accent' }],
            }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'گزینه‌های شروع', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Home — نقطهٔ شروع', cls: 'az-section az-start', innerCls: 'az-wrap', bg: C.surface }
    ),

    /* ---- popular courses (dynamic) ---- */
    section(
      doc,
      'home-courses',
      [
        sectionHead(doc, 'home-courses', {
          kicker: 'دوره‌های آنلاین',
          title: 'دوره‌هایی که هنرجویان از آن‌ها شروع می‌کنند',
          lead: 'فهرست زیر مستقیماً از LearnDash خوانده می‌شود؛ با افزودن دورهٔ جدید به‌روزرسانی می‌شود.',
          link: { label: 'همهٔ دوره‌ها', url: '/courses' },
        }),
        mount(doc, 'home-courses-mount', {
          code: sc('ld_course_list', { num: 3, orderby: 'date', order: 'DESC', col: 3, show_thumbnail: 'true', progress_bar: 'false' }),
          navTitle: 'دوره‌های LearnDash',
          note: 'اگر خروجی خالی است: مطمئن شوید دوره‌ها منتشر شده‌اند و تنظیم «نمایش در فهرست» فعال است.',
        }),
        container(
          doc,
          'home-courses-helper',
          [
            heading(doc, 'home-courses-help-title', 'سه گام تا اولین قطعه', { level: 'h3', title: 'H3 — سه گام تا اولین قطعه' }),
            iconList(doc, 'home-courses-help-list', [
              'انتخاب دوره بر اساس سطح فعلی شما',
              'تمرین روی دار یا میز کار و ارسال تکلیف',
              'دریافت بازخورد اصلاحی و ادامهٔ مسیر',
            ], { title: 'گام‌ها' }),
          ],
          { title: 'راهنمای انتخاب', cls: 'az-card az-card--cream az-stack', g: 12 }
        ),
      ],
      { title: 'Home — دوره‌ها', cls: 'az-section az-popular-courses', innerCls: 'az-wrap' }
    ),

    /* ---- in-person workshop preview ---- */
    section(
      doc,
      'home-workshop',
      [
        container(
          doc,
          'home-workshop-grid',
          [
            container(
              doc,
              'home-workshop-copy',
              [
                kicker(doc, 'home-workshop-kicker', 'کلاس‌های حضوری'),
                heading(doc, 'home-workshop-title', 'کار در کارگاه، روی دار واقعی', { level: 'h2', title: 'H2 — کلاس حضوری' }),
                paragraph(doc, 'home-workshop-lead', 'کلاس‌های حضوری با ظرفیت محدود برگزار می‌شوند تا هر هنرجو دار و ابزار خودش را داشته باشد. برنامهٔ هر کلاس، نشانی سالن و ظرفیت باقی‌مانده در صفحهٔ همان کلاس اعلام می‌شود.', { size: 16, color: C.muted }),
                iconList(doc, 'home-workshop-list', ['ظرفیت محدود و ثبت‌نام به‌ترتیب پرداخت', 'ابزار و مواد پایه در کارگاه فراهم است', 'برنامهٔ جلسات پیش از شروع اعلام می‌شود'], { title: 'ویژگی‌های کلاس حضوری' }),
                container(
                  doc,
                  'home-workshop-actions',
                  [
                    button(doc, 'home-workshop-a1', 'مشاهدهٔ کلاس‌ها', '/workshops', { variant: 'accent', block: true, title: 'CTA — مشاهدهٔ کلاس‌ها' }),
                    button(doc, 'home-workshop-a2', 'راهنمای ثبت‌نام', '/start-here', { variant: 'outline', block: true, title: 'CTA — راهنمای ثبت‌نام' }),
                  ],
                  { title: 'دکمه‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }
                ),
              ],
              { title: 'متن کلاس حضوری', cls: 'az-stack', g: 14 }
            ),
            container(
              doc,
              'home-workshop-visual',
              [mediaFrame(doc, 'home-workshop-frame', { label: 'کارگاه', note: 'جای تصویر فضای کارگاه', ratio: '4 / 5', title: 'قاب تصویر کارگاه' })],
              { title: 'تصویر کارگاه', cls: 'az-hero__visual', g: 0 }
            ),
          ],
          {
            title: 'شبکهٔ کلاس حضوری',
            cls: 'az-split',
            direction: 'row',
            wrap: 'wrap',
            g: 34,
            align: 'center',
            responsive: { mobile: { flex_direction: 'column' } },
          }
        ),
      ],
      { title: 'Home — پیش‌نمایش کلاس حضوری', cls: 'az-section az-workshop-preview', innerCls: 'az-wrap', bg: C.surface }
    ),

    roadmap(doc, 'home-road', ROADMAP, { title: 'نقشهٔ راه یادگیری', lead: 'از انتخاب مسیر تا تحویل اولین قطعه، چهار مرحله پیش رو دارید.', navTitle: 'Home — نقشه راه' }),

    section(
      doc,
      'home-masters',
      [
        sectionHead(doc, 'home-masters', { kicker: 'مدرسان', title: 'یادگیری کنار مدرس', lead: 'هر دوره توسط مدرسی با تمرکز تخصصی روی همان رشته برگزار می‌شود.', link: { label: 'همهٔ مدرسان', url: '/instructors' } }),
        grid(doc, 'home-masters-grid', INSTRUCTORS.slice(0, 3).map((ins, i) => instructorCard(doc, `home-master-${i}`, ins)), {
          cols: 3,
          tablet: 2,
          mobile: 1,
          title: 'مدرسان شاخص',
          cls: 'az-grid az-grid--3',
        }),
      ],
      { title: 'Home — مدرسان', cls: 'az-section az-masters', innerCls: 'az-wrap', bg: C.surface }
    ),

    galleryBlock(doc, 'home-gallery', [
      { label: 'دار قالی', note: 'فضای کارگاه' },
      { label: 'رنگرزی', note: 'رنگ‌های گیاهی' },
      { label: 'گلیم', note: 'بافت سوماک' },
      { label: 'نقشه', note: 'طراحی نقشه' },
      { label: 'آثار', note: 'قطعات هنرجویان' },
      { label: 'ابزار', note: 'وسایل کار' },
    ], { title: 'از فضای کارگاه', lead: 'نگاهی به دارها، ابزار و رنگ‌هایی که در کلاس‌ها با آن‌ها کار می‌کنیم.', navTitle: 'Home — گالری کارگاه' }),

    section(
      doc,
      'home-works',
      [
        sectionHead(doc, 'home-works', { kicker: 'آثار هنرجویان', title: 'نتیجهٔ تمرین، قاب‌شده', lead: 'هر اثر با تکنیک و مواد واقعی ثبت شده است.', link: { label: 'همهٔ آثار', url: '/works' } }),
        grid(doc, 'home-works-grid', ARTWORKS.slice(0, 3).map((a, i) => artworkCard(doc, `home-work-${i}`, a)), {
          cols: 3,
          tablet: 2,
          mobile: 1,
          title: 'آثار شاخص',
          cls: 'az-grid az-grid--3',
        }),
      ],
      { title: 'Home — آثار', cls: 'az-section az-works', innerCls: 'az-wrap' }
    ),

    testimonialRow(doc, 'home-testimonials', TESTIMONIALS, { title: 'تجربهٔ هنرجویان', lead: 'متن‌ها پس از تأیید شما جایگزین می‌شود.', navTitle: 'Home — تأییدیه‌ها' }),

    section(
      doc,
      'home-blog',
      [
        sectionHead(doc, 'home-blog', { kicker: 'مجله', title: 'از مجلهٔ کارگاه', lead: 'نوشته‌های کوتاه دربارهٔ تکنیک، مواد و نگه‌داری آثار.', link: { label: 'همهٔ نوشته‌ها', url: '/blog' } }),
        container(
          doc,
          'home-blog-posts',
          [
            widget(doc, 'home-blog-widget', 'posts', {
              posts_per_page: '3',
              columns: '3',
              columns_tablet: '2',
              columns_mobile: '1',
              thumbnail_size: 'medium_large',
              show_excerpt: 'yes',
              excerpt_length: '22',
              show_read_more: 'yes',
              read_more_text: 'ادامهٔ مطلب',
              meta_data: ['date'],
              pagination_type: '',
            }, { title: 'آخرین نوشته‌ها', cls: 'az-posts-widget' }),
          ],
          { title: 'فهرست نوشته‌ها', cls: 'az-posts-wrap', g: 0 }
        ),
      ],
      { title: 'Home — مجله', cls: 'az-section az-blog-preview', innerCls: 'az-wrap', bg: C.surface }
    ),

    ctaBand(doc, 'home-cta', {
      title: 'شروع کنید، قطعهٔ اول‌تان را خودتان می‌بافید',
      body: 'اگر نمی‌دانید کدام دوره مناسب‌تان است، صفحهٔ راهنما بر اساس هدف و سطح شما پیشنهاد می‌دهد.',
      primary: { label: 'از کجا شروع کنم؟', url: '/start-here' },
      secondary: { label: 'تماس با کارگاه', url: '/contact' },
      navTitle: 'Home — دعوت به اقدام',
    }),

    section(
      doc,
      'home-social',
      [
        container(
          doc,
          'home-social-inner',
          [
            heading(doc, 'home-social-title', 'در شبکه‌های اجتماعی همراه ما باشید', { level: 'h2', title: 'H2 — شبکه‌های اجتماعی' }),
            paragraph(doc, 'home-social-lead', 'تصویر کارگاه، روند رنگرزی و قطعات هنرجویان را آنجا منتشر می‌کنیم.', { size: 16, color: C.muted }),
            container(
              doc,
              'home-social-row',
              Object.values(SOCIAL).map((s, i) => button(doc, `home-social-${i}`, s.label, s.url, { variant: i === 0 ? 'primary' : 'ghost', block: true, title: `CTA — ${s.label}` })),
              { title: 'لینک‌های اجتماعی', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 10, responsive: { mobile: { flex_direction: 'column' } } }
            ),
          ],
          { title: 'شبکه‌های اجتماعی', cls: 'az-stack', g: 12 }
        ),
      ],
      { title: 'Home — شبکه‌های اجتماعی', cls: 'az-section az-section--tight az-social', innerCls: 'az-wrap', bg: C.surface }
    ),
  ];
}

/* =========================================================== START HERE */
function startHereBuild(doc) {
  const levelCard = (level, desc, recommended) =>
    card(doc, `start-level-${level}`, {
      navTitle: `سطح — ${level}`,
      title: level,
      lead: desc,
      bullets: recommended.map((c) => c.title),
      actions: [{ label: 'مشاهدهٔ دوره', url: `/courses/${recommended[0].slug}` }],
    });

  return [
    pageHero(doc, 'start-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'از کجا شروع کنم؟', url: '/start-here' }],
      kicker: 'راهنمای انتخاب',
      title: 'از کجا شروع کنید؟',
      lead: 'سه نوع مسیر داریم و سه سطح. این صفحه کمک می‌کند بر اساس هدف و زمانی که دارید انتخاب کنید.',
      actions: [{ label: 'پرسش از کارگاه', url: '/contact', variant: 'outline' }],
      navTitle: 'Start — سربرگ',
    }),

    section(
      doc,
      'start-types',
      [
        sectionHead(doc, 'start-types', { title: 'نوع مسیر', lead: 'پیش از انتخاب دوره، نوع مسیر را مشخص کنید.' }),
        grid(
          doc,
          'start-types-grid',
          [
            card(doc, 'start-type-online', {
              navTitle: 'نوع — آنلاین',
              icon: { value: 'fas fa-video', library: 'fa-solid' },
              title: 'دورهٔ آنلاین',
              lead: 'اگر زمان رفت‌وآمد ندارید یا خارج از شهر هستید.',
              bullets: ['زمان‌بندی منعطف', 'محتوای ضبط‌شده', 'بررسی تکلیف'],
              actions: [{ label: 'دوره‌ها', url: '/courses' }],
            }),
            card(doc, 'start-type-path', {
              navTitle: 'نوع — مسیر',
              icon: { value: 'fas fa-route', library: 'fa-solid' },
              title: 'مسیر یادگیری',
              lead: 'اگر می‌خواهید مجموعه‌ای از دوره‌ها را پشت‌سرهم طی کنید.',
              bullets: ['توالی مشخص', 'هدف نهایی روشن', 'بستهٔ اقتصادی‌تر'],
              actions: [{ label: 'مسیرها', url: '/learning-paths' }],
            }),
            card(doc, 'start-type-inperson', {
              navTitle: 'نوع — حضوری',
              icon: { value: 'fas fa-hands-holding', library: 'fa-solid' },
              title: 'کلاس حضوری',
              lead: 'اگر یادگیری با دست و حضور در کارگاه را ترجیح می‌دهید.',
              bullets: ['دار و ابزار در کارگاه', 'ظرفیت محدود', 'برنامهٔ مشخص'],
              actions: [{ label: 'کلاس‌ها', url: '/workshops', variant: 'accent' }],
            }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'نوع مسیر', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Start — نوع مسیر', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),

    section(
      doc,
      'start-levels',
      [
        sectionHead(doc, 'start-levels', { title: 'سطح شما', lead: 'اگر تجربه ندارید از مقدماتی شروع کنید؛ در غیر این صورت سطح متوسط زمان شما را هدر نمی‌دهد.' }),
        grid(
          doc,
          'start-levels-grid',
          [
            levelCard('مقدماتی', 'بدون نیاز به تجربهٔ قبلی؛ از نصب دار و اولین گره.', COURSES.filter((c) => c.level === 'مقدماتی')),
            levelCard('متوسط', 'برای کسانی که بافت پایه را بلدند و می‌خواهند دقت‌شان را بالا ببرند.', COURSES.filter((c) => c.level === 'متوسط')),
            levelCard('پیشرفته', 'پروژه‌های تخصصی و ورود به کار حرفه‌ای.', COURSES.filter((c) => c.level === 'پیشرفته')),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'سطوح', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Start — سطح', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    faqBlock(doc, 'start-faq', FAQ.courses, { title: 'پیش از انتخاب بخوانید', navTitle: 'Start — پرسش‌ها' }),

    ctaBand(doc, 'start-cta', {
      title: 'هنوز مردد هستید؟',
      body: 'هدف و سطح‌تان را در فرم تماس بنویسید تا مسیر مناسب پیشنهاد شود.',
      primary: { label: 'پرسش از کارگاه', url: '/contact' },
      secondary: { label: 'مشاهدهٔ همهٔ دوره‌ها', url: '/courses' },
      navTitle: 'Start — دعوت به اقدام',
    }),
  ];
}

/* ================================================================ ABOUT */
function aboutBuild(doc) {
  return [
    pageHero(doc, 'about-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'دربارهٔ کارگاه', url: '/about' }],
      kicker: 'دربارهٔ کارگاه',
      title: 'کارگاهی که یادگیری در آن با دست اتفاق می‌افتد',
      lead: 'اسدزاده یک کارگاه آموزشی در حوزهٔ فرش، گلیم و رنگرزی سنتی است؛ جایی که هنرجو از همان جلسهٔ اول با مواد و ابزار واقعی کار می‌کند.',
      navTitle: 'About — سربرگ',
    }),

    section(
      doc,
      'about-story',
      [
        container(
          doc,
          'about-story-grid',
          [
            container(
              doc,
              'about-story-copy',
              [
                kicker(doc, 'about-story-kicker', 'داستان کارگاه'),
                heading(doc, 'about-story-title', 'از یک دار تا یک کارگاه آموزشی', { level: 'h2', title: 'H2 — داستان کارگاه' }),
                paragraph(doc, 'about-story-p1', 'REPLACE: روایت شکل‌گیری کارگاه — چه سالی، با چه هدفی و با کدام نیاز هنرجویان شروع شد. این متن باید با واقعیت کارگاه تطبیق داده شود.', { size: 16 }),
                paragraph(doc, 'about-story-p2', 'REPLACE: ادامهٔ روایت — رشد کارگاه، افزوده‌شدن رشته‌های جدید و نسبت آن با آموزش امروز.', { size: 16, color: C.muted }),
              ],
              { title: 'متن داستان', cls: 'az-stack', g: 14 }
            ),
            container(doc, 'about-story-visual', [mediaFrame(doc, 'about-story-frame', { label: 'کارگاه', note: 'جای تصویر قدیمی/جدید کارگاه', ratio: '4 / 5', title: 'قاب تصویر داستان' })], { title: 'تصویر داستان', cls: 'az-hero__visual', g: 0 }),
          ],
          { title: 'شبکهٔ داستان', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 34, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'About — داستان', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    section(
      doc,
      'about-philosophy',
      [
        sectionHead(doc, 'about-philosophy', { kicker: 'رویکرد آموزشی', title: 'چه‌طور یاد می‌دهیم', lead: 'سه اصل ثابت در همهٔ دوره‌ها و کلاس‌ها.' }),
        grid(
          doc,
          'about-philosophy-grid',
          [
            card(doc, 'about-p1', { navTitle: 'اصل — کار با دست', icon: { value: 'fas fa-hands', library: 'fa-solid' }, title: 'کار با دست، نه فقط تماشا', lead: 'هر جلسه خروجی عملی دارد؛ هنرجو همان روز چیزی می‌بافد یا رنگ می‌سازد.' }),
            card(doc, 'about-p2', { navTitle: 'اصل — بازخورد', icon: { value: 'fas fa-comments', library: 'fa-solid' }, title: 'بازخورد روی اثر شما', lead: 'تکالیف بررسی می‌شود و ایرادها با توضیح مشخص برگردانده می‌شود.' }),
            card(doc, 'about-p3', { navTitle: 'اصل — ریشه', icon: { value: 'fas fa-leaf', library: 'fa-solid' }, title: 'پایبندی به ریشهٔ فن', lead: 'تکنیک‌های سنتی با زبان امروز آموزش داده می‌شود، بدون ساده‌سازیِ بی‌پایه.' }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'اصول', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'About — رویکرد', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),

    section(
      doc,
      'about-method',
      [
        sectionHead(doc, 'about-method', { title: 'روش تدریس', lead: 'از معرفی ابزار تا تحویل قطعه، این ترتیب در همهٔ دوره‌ها رعایت می‌شود.' }),
        container(
          doc,
          'about-method-steps',
          [
            { t: 'آشنایی با مواد و ابزار', d: 'شناخت نخ، دار، ابزار و تفاوت کیفیت‌ها پیش از شروع بافت.' },
            { t: 'تمرین‌های کوتاه و هدفمند', d: 'هر تمرین یک مهارت مشخص را تثبیت می‌کند، نه تکرار بی‌هدف.' },
            { t: 'اجرای پروژهٔ مرحله‌ای', d: 'قطعهٔ اصلی در چند مرحله و با بررسی بین‌مرحله‌ای پیش می‌رود.' },
            { t: 'ارزیابی و گام بعدی', d: 'بررسی نهایی، رفع ایرادها و تعیین مسیر ادامه بر اساس سطح هنرجو.' },
          ].map((s, i) =>
            container(
              doc,
              `about-method-${i}`,
              [
                container(doc, `about-method-n-${i}`, [paragraph(doc, `about-method-nt-${i}`, toPersianNum(i + 1), { align: 'center', size: 15, weight: '700', color: '#FFF3E1', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], { title: `شماره ${i + 1}`, cls: 'az-step__n', g: 0, align: 'center', justify: 'center', bg: C.navy, radius: edge(14) }),
                container(doc, `about-method-b-${i}`, [heading(doc, `about-method-t-${i}`, s.t, { level: 'h4', title: `H4 — ${s.t}` }), paragraph(doc, `about-method-d-${i}`, s.d, { size: 15, color: C.muted })], { title: `متن ${i + 1}`, cls: 'az-step__body', g: 4 }),
              ],
              { title: `مرحله ${i + 1}`, cls: 'az-step', direction: 'row', g: 16 }
            )
          ),
          { title: 'مراحل روش تدریس', cls: 'az-steps', g: 0 }
        ),
      ],
      { title: 'About — روش تدریس', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    section(
      doc,
      'about-lineage',
      [
        sectionHead(doc, 'about-lineage', { title: 'نسبت فن با سنت', lead: 'REPLACE: دربارهٔ سابقهٔ رشته در منطقه، نقش مدرسان و انتقال تجربه — پس از تأیید تکمیل شود.' }),
        container(
          doc,
          'about-lineage-grid',
          [
            card(doc, 'about-l1', { navTitle: 'فرش‌بافی', title: 'فرش‌بافی', lead: 'گرهٔ فارسی و ترکی، نقشه‌خوانی و کنترل تراکم در اجرای قطعات کلاسیک و معاصر.' }),
            card(doc, 'about-l2', { navTitle: 'گلیم‌بافی', title: 'گلیم‌بافی', lead: 'بافت‌های سوماک و چرت، نقوش هندسی و ریتم در تکرار.' }),
            card(doc, 'about-l3', { navTitle: 'رنگرزی', title: 'رنگرزی سنتی', lead: 'استخراج رنگ از منابع گیاهی، دندانه‌کاری و ثبت فرمول‌های تکرارپذیر.' }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'رشته‌ها', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'About — نسبت فن', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),

    galleryBlock(doc, 'about-gallery', [
      { label: 'دار قالی', note: 'کارگاه' }, { label: 'رنگرزی', note: 'مواد گیاهی' }, { label: 'گلیم', note: 'بافت' },
      { label: 'نقشه', note: 'طراحی' }, { label: 'ابزار', note: 'وسایل' }, { label: 'آثار', note: 'خروجی دوره' },
    ], { title: 'فضای کارگاه', navTitle: 'About — گالری' }),

    section(
      doc,
      'about-instructor',
      [
        sectionHead(doc, 'about-instructor', { title: 'مدرسان کارگاه', lead: 'هر رشته توسط مدرس همان رشته برگزار می‌شود.', link: { label: 'همهٔ مدرسان', url: '/instructors' } }),
        grid(doc, 'about-instructor-grid', INSTRUCTORS.slice(0, 2).map((ins, i) => instructorCard(doc, `about-ins-${i}`, ins)), { cols: 2, tablet: 2, mobile: 1, title: 'مدرسان', cls: 'az-grid az-grid--2' }),
      ],
      { title: 'About — مدرسان', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    ctaBand(doc, 'about-cta', {
      title: 'کارگاه را از نزدیک ببینید',
      body: 'برای هماهنگی بازدید یا پرسش دربارهٔ دوره‌ها، از صفحهٔ تماس پیام بدهید.',
      primary: { label: 'تماس با کارگاه', url: '/contact' },
      secondary: { label: 'مشاهدهٔ کلاس‌ها', url: '/workshops' },
      navTitle: 'About — دعوت به اقدام',
    }),
  ];
}

/* ============================================================== CONTACT */
function contactBuild(doc) {
  return [
    pageHero(doc, 'contact-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'تماس با ما', url: '/contact' }],
      kicker: 'تماس',
      title: 'در ارتباط باشید',
      lead: 'برای پرسش دربارهٔ دوره، کلاس حضوری یا سفارش، یکی از راه‌های زیر را انتخاب کنید. پاسخ‌گویی در ساعات کاری است.',
      navTitle: 'Contact — سربرگ',
    }),

    section(
      doc,
      'contact-body',
      [
        container(
          doc,
          'contact-grid',
          [
            // form (desktop: left column)
            container(
              doc,
              'contact-form-col',
              [
                heading(doc, 'contact-form-title', 'پیام شما', { level: 'h2', title: 'H2 — پیام شما' }),
                paragraph(doc, 'contact-form-lead', CONTACT.response, { size: 14, color: C.muted }),
                contactForm(doc, 'contact-form', {
                  fields: [
                    { id: 'name', label: 'نام و نام خانوادگی', type: 'text', placeholder: 'نام کامل', width: '50', required: 'true' },
                    { id: 'tel', label: 'شماره تماس', type: 'tel', placeholder: '09xxxxxxxxx', width: '50', required: 'true' },
                    { id: 'subject', label: 'موضوع پیام', type: 'select', options: ['راهنمای انتخاب دوره', 'ثبت‌نام کلاس حضوری', 'سفارش اثر یا ابزار', 'همکاری با کارگاه'], required: 'true' },
                    { id: 'message', label: 'پیام', type: 'textarea', placeholder: 'کوتاه بنویسید تا دقیق‌تر راهنمایی کنیم', rows: 5 },
                  ],
                  button: 'ارسال پیام',
                  title: 'فرم تماس',
                }),
              ],
              { title: 'ستون فرم', cls: 'az-stack', g: 12 }
            ),
            // methods
            container(
              doc,
              'contact-info-col',
              [contactPanel(doc, 'contact-panel', { navTitle: 'اطلاعات تماس' })],
              { title: 'ستون اطلاعات', cls: 'az-stack', g: 16 }
            ),
          ],
          {
            title: 'شبکهٔ تماس',
            cls: 'az-split az-contact-split',
            direction: 'row',
            wrap: 'wrap',
            g: 26,
            responsive: {
              mobile: {
                flex_direction: 'column',
                // spec §12: on mobile, contact methods come before the long form
                flex_wrap: 'wrap',
              },
            },
            customCss: `@media (max-width:767px){ selector{ display:flex; flex-direction:column; } selector > .elementor-element:first-child{ order:2; } selector > .elementor-element:last-child{ order:1; } }`,
          }
        ),
      ],
      { title: 'Contact — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    section(doc, 'contact-map', [mapPanel(doc, 'contact-map-panel', { navTitle: 'Contact — نقشه' })], {
      title: 'Contact — نقشه',
      cls: 'az-section az-section--tight',
      innerCls: 'az-wrap',
      bg: C.surface,
    }),

    section(
      doc,
      'contact-visit',
      [
        sectionHead(doc, 'contact-visit', { title: 'پیش از مراجعه', lead: 'برای بازدید یا تحویل سفارش، این نکات را در نظر بگیرید.' }),
        grid(
          doc,
          'contact-visit-grid',
          [
            card(doc, 'contact-v1', { navTitle: 'راهنما — هماهنگی', icon: { value: 'fas fa-phone', library: 'fa-solid' }, title: 'هماهنگی پیش از مراجعه', lead: 'REPLACE: آیا مراجعه نیاز به هماهنگی قبلی دارد؟' }),
            card(doc, 'contact-v2', { navTitle: 'راهنما — دسترسی', icon: { value: 'fas fa-map', library: 'fa-solid' }, title: 'دسترسی و پارک', lead: 'REPLACE: مسیر دسترسی، ایستگاه یا پارکینگ نزدیک کارگاه.' }),
            card(doc, 'contact-v3', { navTitle: 'راهنما — ساعات', icon: { value: 'fas fa-clock', library: 'fa-solid' }, title: 'ساعات کاری', lead: `${CONTACT.hoursWeek} — ${CONTACT.hoursThu} — ${CONTACT.hoursFri}` }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'راهنما', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Contact — راهنما', cls: 'az-section', innerCls: 'az-wrap' }
    ),

    faqBlock(doc, 'contact-faq', FAQ.commerce, { title: 'پرسش‌های پرتکرار تماس', navTitle: 'Contact — پرسش‌ها' }),
  ];
}

/* ============================================================ WORKS etc */
function worksBuild(doc) {
  return [
    pageHero(doc, 'works-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'آثار هنرجویان', url: '/works' }],
      kicker: 'آثار',
      title: 'آثار هنرجویان کارگاه',
      lead: 'قطعاتی که در دوره‌ها و کلاس‌ها ساخته شده‌اند؛ با تکنیک و مواد ثبت‌شده برای هر اثر.',
      navTitle: 'Works — سربرگ',
    }),
    section(
      doc,
      'works-grid',
      [
        container(
          doc,
          'works-mount',
          [widget(doc, 'works-grid-widget', 'bdt-dynamic-grid', { columns: '3', columns_tablet: '2', columns_mobile: '1', limit: 12, show_pagination: '' }, { title: 'گرید داینامیک آثار (Element Pack)', cls: 'az-ep-dynamic-grid' })],
          { title: 'گرید آثار', cls: 'az-mount', g: 0 }
        ),
        paragraph(doc, 'works-note', 'این گرید از Dynamic Grid المنت‌پک یا Loop Grid المنتور پرو تغذیه می‌شود؛ پس از Import، قالب «Loop — اثر» را انتخاب کنید. در صورت نبود افزونه، گرید ثابت زیر نمایش داده می‌شود.', { size: 13, color: C.muted, cls: 'az-form-note' }),
        grid(doc, 'works-fallback', ARTWORKS.map((a, i) => artworkCard(doc, `works-f-${i}`, a)), { cols: 3, tablet: 2, mobile: 1, title: 'فهرست جایگزین آثار', cls: 'az-grid az-grid--3' }),
      ],
      { title: 'Works — گرید', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    ctaBand(doc, 'works-cta', { title: 'اثر شما می‌تواند اینجا باشد', body: 'با شروع یک دوره و ارسال تکالیف، قطعهٔ شما هم در این مجموعه قرار می‌گیرد.', primary: { label: 'مشاهدهٔ دوره‌ها', url: '/courses' }, navTitle: 'Works — دعوت به اقدام' }),
  ];
}

function singleArtworkBuild(doc) {
  return [
    section(
      doc,
      'art-hero',
      [
        breadcrumbs(doc, 'art', [{ label: 'خانه', url: '/' }, { label: 'آثار', url: '/works' }, { label: 'عنوان اثر', url: '#' }]),
        container(
          doc,
          'art-grid',
          [
            container(doc, 'art-media', [mediaFrame(doc, 'art-frame', { label: 'اثر', note: 'جای تصویر اثر', ratio: '1 / 1', title: 'قاب تصویر اثر' })], { title: 'تصویر اثر', cls: 'az-art-media', g: 0 }),
            container(
              doc,
              'art-copy',
              [
                kicker(doc, 'art-kicker', 'تکنیک — REPLACE'),
                heading(doc, 'art-title', 'عنوان اثر', { level: 'h1', title: 'H1 — عنوان اثر' }),
                metaRow(doc, 'art', ['REPLACE: مواد', 'REPLACE: ابعاد', 'REPLACE: سال'], { title: 'متادادهٔ اثر' }),
                paragraph(doc, 'art-story', 'REPLACE: روایت اثر — ایده، روند ساخت و نکته‌ای که هنرجو در این قطعه تمرین کرده است.', { size: 16 }),
                container(doc, 'art-actions', [button(doc, 'art-back', 'بازگشت به آثار', '/works', { variant: 'outline', block: true, title: 'CTA — بازگشت' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 10 }),
              ],
              { title: 'متن اثر', cls: 'az-stack', g: 14 }
            ),
          ],
          { title: 'شبکهٔ اثر', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 30, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Artwork — سربرگ', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'art-gallery',
      [
        sectionHead(doc, 'art-gallery', { title: 'جزئیات اثر', lead: 'تصاویر نزدیک از بافت و رنگ.' }),
        container(doc, 'art-gallery-grid', [0, 1, 2].map((i) => mediaFrame(doc, `art-g-${i}`, { label: 'جزئیات', note: `نگارهٔ ${toPersianNum(i + 1)}`, ratio: '1 / 1', title: `قاب جزئیات ${i + 1}` })), { title: 'گرید جزئیات', cls: 'az-gallery', direction: 'row', wrap: 'wrap', g: 14 }),
      ],
      { title: 'Artwork — جزئیات', cls: 'az-section az-section--tight', innerCls: 'az-wrap' }
    ),
    section(
      doc,
      'art-related',
      [
        sectionHead(doc, 'art-related', { title: 'آثار مرتبط', link: { label: 'همهٔ آثار', url: '/works' } }),
        grid(doc, 'art-related-grid', ARTWORKS.slice(0, 3).map((a, i) => artworkCard(doc, `art-rel-${i}`, a)), { cols: 3, tablet: 2, mobile: 1, title: 'آثار مرتبط', cls: 'az-grid az-grid--3' }),
      ],
      { title: 'Artwork — مرتبط', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
  ];
}

function blogBuild(doc) {
  return [
    pageHero(doc, 'blog-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'مجله', url: '/blog' }],
      kicker: 'مجلهٔ کارگاه',
      title: 'نوشته‌هایی دربارهٔ تکنیک، مواد و نگه‌داری',
      lead: 'تجربه‌های کارگاه، معرفی مواد و پاسخ به پرسش‌های پرتکرار هنرجویان.',
      navTitle: 'Blog — سربرگ',
    }),
    section(
      doc,
      'blog-list',
      [
        container(
          doc,
          'blog-posts',
          [
            widget(doc, 'blog-posts-widget', 'posts', {
              posts_per_page: '9',
              columns: '3',
              columns_tablet: '2',
              columns_mobile: '1',
              thumbnail_size: 'medium_large',
              show_excerpt: 'yes',
              excerpt_length: '26',
              show_read_more: 'yes',
              read_more_text: 'ادامهٔ مطلب',
              meta_data: ['date', 'comments'],
              pagination_type: 'numbers',
            }, { title: 'فهرست نوشته‌ها', cls: 'az-posts-widget' }),
          ],
          { title: 'فهرست نوشته‌ها', cls: 'az-posts-wrap', g: 0 }
        ),
      ],
      { title: 'Blog — فهرست', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    ctaBand(doc, 'blog-cta', { title: 'یادگیری را از یک دوره شروع کنید', body: 'نوشته‌ها برای آشنایی‌اند؛ خروجی واقعی روی دار به دست می‌آید.', primary: { label: 'مشاهدهٔ دوره‌ها', url: '/courses' }, navTitle: 'Blog — دعوت به اقدام' }),
  ];
}

function singlePostBuild(doc) {
  return [
    section(
      doc,
      'post-hero',
      [
        breadcrumbs(doc, 'post', [{ label: 'خانه', url: '/' }, { label: 'مجله', url: '/blog' }, { label: 'عنوان نوشته', url: '#' }]),
        container(
          doc,
          'post-head',
          [
            heading(doc, 'post-title', 'عنوان نوشته', { level: 'h1', title: 'H1 — عنوان نوشته' }),
            metaRow(doc, 'post', ['REPLACE: تاریخ انتشار', 'REPLACE: دسته', 'REPLACE: زمان مطالعه'], { title: 'متادادهٔ نوشته' }),
          ],
          { title: 'سربرگ نوشته', cls: 'az-stack', g: 12 }
        ),
      ],
      { title: 'Post — سربرگ', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'post-body',
      [
        container(doc, 'post-media', [mediaFrame(doc, 'post-frame', { label: 'تصویر شاخص', note: '', ratio: '16 / 9', title: 'تصویر شاخص نوشته' })], { title: 'تصویر شاخص', cls: 'az-post-media', g: 0 }),
        container(
          doc,
          'post-content',
          [widget(doc, 'post-content-widget', 'theme-post-content', { text_color: C.text, typography_typography: 'custom', typography_font_family: 'Peyda', typography_font_size: { unit: 'px', size: 16.5, sizes: [] }, typography_line_height: { unit: 'em', size: 2, sizes: [] } }, { title: 'محتوای نوشته (داینامیک)', cls: 'az-mount az-post-content' })],
          { title: 'محتوای نوشته', cls: 'az-post-content-wrap', g: 0 }
        ),
        container(doc, 'post-actions', [button(doc, 'post-back', 'بازگشت به مجله', '/blog', { variant: 'outline', block: true, title: 'CTA — بازگشت به مجله' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 10 }),
      ],
      { title: 'Post — بدنه', cls: 'az-section', innerCls: 'az-wrap az-post-wrap' }
    ),
    section(
      doc,
      'post-related',
      [
        sectionHead(doc, 'post-related', { title: 'نوشته‌های مرتبط' }),
        container(
          doc,
          'post-related-mount',
          [widget(doc, 'post-related-widget', 'posts', { posts_per_page: '3', columns: '3', columns_tablet: '2', columns_mobile: '1', show_excerpt: 'yes', excerpt_length: '18', meta_data: ['date'] }, { title: 'نوشته‌های مرتبط', cls: 'az-posts-widget' })],
          { title: 'نوشته‌های مرتبط', cls: 'az-mount', g: 0 }
        ),
      ],
      { title: 'Post — مرتبط', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
    ctaBand(doc, 'post-cta', { title: 'از خواندن به ساختن برسید', body: 'اگر این نوشته به کارتان آمد، دورهٔ مرتبط را ببینید.', primary: { label: 'دوره‌ها', url: '/courses' }, navTitle: 'Post — دعوت به اقدام' }),
  ];
}

function instructorsBuild(doc) {
  return [
    pageHero(doc, 'ins-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'مدرسان', url: '/instructors' }],
      kicker: 'مدرسان',
      title: 'مدرسان کارگاه',
      lead: 'هر رشته توسط مدرسی تدریس می‌شود که تمرکز حرفه‌ای‌اش روی همان رشته است.',
      navTitle: 'Instructors — سربرگ',
    }),
    section(
      doc,
      'ins-grid',
      [
        container(
          doc,
          'ins-mount',
          [widget(doc, 'ins-grid-widget', 'bdt-dynamic-grid', { columns: '4', columns_tablet: '2', columns_mobile: '1', limit: 12 }, { title: 'گرید داینامیک مدرسان (Element Pack)', cls: 'az-ep-dynamic-grid' })],
          { title: 'گرید مدرسان', cls: 'az-mount', g: 0 }
        ),
        paragraph(doc, 'ins-note', 'در صورت استفاده از CPT مدرس، این گرید داینامیک است؛ در غیر این صورت فهرست ثابت زیر جایگزین می‌شود.', { size: 13, color: C.muted, cls: 'az-form-note' }),
        grid(doc, 'ins-fallback', INSTRUCTORS.map((ins, i) => instructorCard(doc, `ins-f-${i}`, ins)), { cols: 4, tablet: 2, mobile: 1, title: 'فهرست مدرسان', cls: 'az-grid az-grid--4' }),
      ],
      { title: 'Instructors — فهرست', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    ctaBand(doc, 'ins-cta', { title: 'یادگیری کنار مدرس', body: 'دورهٔ هر مدرس را از صفحهٔ خودش دنبال کنید.', primary: { label: 'مشاهدهٔ دوره‌ها', url: '/courses' }, navTitle: 'Instructors — دعوت به اقدام' }),
  ];
}

function singleInstructorBuild(doc) {
  return [
    section(
      doc,
      'ins1-hero',
      [
        breadcrumbs(doc, 'ins1', [{ label: 'خانه', url: '/' }, { label: 'مدرسان', url: '/instructors' }, { label: 'نام مدرس', url: '#' }]),
        container(
          doc,
          'ins1-grid',
          [
            container(doc, 'ins1-media', [mediaFrame(doc, 'ins1-frame', { label: 'پرترهٔ مدرس', note: 'جای تصویر', ratio: '1 / 1', title: 'قاب تصویر مدرس' })], { title: 'تصویر مدرس', cls: 'az-ins-media', g: 0 }),
            container(
              doc,
              'ins1-copy',
              [
                kicker(doc, 'ins1-kicker', 'مدرس'),
                heading(doc, 'ins1-title', 'REPLACE: نام مدرس', { level: 'h1', title: 'H1 — نام مدرس' }),
                metaRow(doc, 'ins1', ['REPLACE: تخصص', 'REPLACE: سال تجربه'], { title: 'متادادهٔ مدرس' }),
                paragraph(doc, 'ins1-bio', 'REPLACE: بیوگرافی مدرس — سوابق آموزشی و حرفه‌ای پس از تأیید تکمیل می‌شود.', { size: 16 }),
                paragraph(doc, 'ins1-philosophy', 'REPLACE: نگاه آموزشی مدرس در دو سه جمله.', { size: 15.5, color: C.muted }),
                container(doc, 'ins1-actions', [button(doc, 'ins1-courses', 'مشاهدهٔ دوره‌ها', '/courses', { variant: 'primary', block: true, title: 'CTA — دوره‌ها' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 10 }),
              ],
              { title: 'متن مدرس', cls: 'az-stack', g: 14 }
            ),
          ],
          { title: 'شبکهٔ مدرس', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 30, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Instructor — سربرگ', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'ins1-courses',
      [
        sectionHead(doc, 'ins1-courses', { title: 'دوره‌های این مدرس', lead: 'فهرست زیر بر اساس ارتباط مدرس با دوره‌ها پر می‌شود.' }),
        container(doc, 'ins1-courses-mount', [shortcodeWidget(doc, 'ins1-courses-sc', sc('az_instructor_courses'), { title: 'دوره‌های مدرس (داینامیک)' })], { title: 'دوره‌های مدرس', cls: 'az-mount', g: 0 }),
        grid(doc, 'ins1-courses-fallback', COURSES.slice(0, 2).map((c, i) => courseCard(doc, `ins1-c-${i}`, c)), { cols: 2, tablet: 2, mobile: 1, title: 'دوره‌ها (جایگزین ثابت)', cls: 'az-grid az-grid--2' }),
      ],
      { title: 'Instructor — دوره‌ها', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    section(
      doc,
      'ins1-works',
      [
        sectionHead(doc, 'ins1-works', { title: 'آثار هنرجویان این مدرس' }),
        container(doc, 'ins1-works-grid', [0, 1, 2].map((i) => mediaFrame(doc, `ins1-w-${i}`, { label: 'اثر', note: `نگارهٔ ${toPersianNum(i + 1)}`, ratio: '1 / 1', title: `قاب اثر ${i + 1}` })), { title: 'آثار', cls: 'az-gallery', direction: 'row', wrap: 'wrap', g: 14 }),
      ],
      { title: 'Instructor — آثار', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),
    ctaBand(doc, 'ins1-cta', { title: 'با این مدرس شروع کنید', body: 'دورهٔ مرتبط را انتخاب کنید یا برای پرسش از کارگاه پیام بدهید.', primary: { label: 'تماس با کارگاه', url: '/contact' }, navTitle: 'Instructor — دعوت به اقدام' }),
  ];
}

function galleryBuild(doc) {
  return [
    pageHero(doc, 'gal-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'گالری', url: '/gallery' }],
      kicker: 'گالری',
      title: 'تصاویر کارگاه',
      lead: 'دارها، ابزار، رنگ‌ها و قطعاتی که در کارگاه ساخته شده‌اند.',
      navTitle: 'Gallery — سربرگ',
    }),
    galleryBlock(doc, 'gal-main', [
      { label: 'دار قالی', note: 'کارگاه' }, { label: 'رنگرزی', note: 'مواد گیاهی' }, { label: 'گلیم', note: 'بافت' },
      { label: 'نقشه', note: 'طراحی' }, { label: 'ابزار', note: 'وسایل' }, { label: 'آثار', note: 'خروجی دوره' },
      { label: 'کلاس', note: 'آموزش' }, { label: 'جزئیات', note: 'بافت نزدیک' },
    ], { title: 'فضای کارگاه', variant: 'az-gallery--wide', navTitle: 'Gallery — گرید' }),
    ctaBand(doc, 'gal-cta', { title: 'در کارگاه همراه ما باشید', body: 'کلاس‌های حضوری با ظرفیت محدود برگزار می‌شود.', primary: { label: 'مشاهدهٔ کلاس‌ها', url: '/workshops' }, navTitle: 'Gallery — دعوت به اقدام' }),
  ];
}

/* ================================================================ FAQ */
function faqBuild(doc) {
  return [
    pageHero(doc, 'faq-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'پرسش‌های پرتکرار', url: '/faq' }],
      kicker: 'راهنما',
      title: 'پرسش‌های پرتکرار',
      lead: 'پاسخ پرسش‌های رایج دربارهٔ دوره‌ها، کلاس‌های حضوری، پرداخت و گواهی.',
      navTitle: 'FAQ — سربرگ',
    }),
    faqBlock(doc, 'faq-courses', FAQ.courses, { title: 'دوره‌های آنلاین', navTitle: 'FAQ — دوره‌ها' }),
    faqBlock(doc, 'faq-workshops', FAQ.workshops, { title: 'کلاس‌های حضوری', navTitle: 'FAQ — کلاس‌ها' }),
    faqBlock(doc, 'faq-commerce', FAQ.commerce, { title: 'پرداخت و سفارش', navTitle: 'FAQ — پرداخت' }),
    faqBlock(doc, 'faq-certificates', FAQ.certificates, { title: 'گواهی‌ها', navTitle: 'FAQ — گواهی' }),
    ctaBand(doc, 'faq-cta', { title: 'پاسخ‌تان را پیدا نکردید؟', body: 'از صفحهٔ تماس پیام بدهید تا دقیق‌تر راهنمایی کنید.', primary: { label: 'تماس با ما', url: '/contact' }, navTitle: 'FAQ — دعوت به اقدام' }),
  ];
}

function supportBuild(doc) {
  return [
    pageHero(doc, 'sup-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'پشتیبانی', url: '/support' }],
      kicker: 'پشتیبانی',
      title: 'پشتیبانی آموزشی و فنی',
      lead: 'مشکل در دسترسی به دوره، پخش ویدیو، ثبت تکلیف یا سفارش را از اینجا پیگیری کنید.',
      navTitle: 'Support — سربرگ',
    }),
    section(
      doc,
      'sup-channels',
      [
        sectionHead(doc, 'sup-channels', { title: 'راه‌های پیگیری', lead: 'نزدیک‌ترین مسیر به مشکل خود را انتخاب کنید.' }),
        grid(
          doc,
          'sup-grid',
          [
            card(doc, 'sup-1', {
              navTitle: 'کانال — آموزشی',
              icon: { value: 'fas fa-graduation-cap', library: 'fa-solid' },
              title: 'پشتیبانی آموزشی',
              lead: 'پرسش دربارهٔ محتوای درس، تکلیف یا بازخورد مدرس.',
              bullets: ['از طریق بخش تکالیف ارسال شود', 'پاسخ در همان صفحه نمایش داده می‌شود'],
              actions: [{ label: 'تکالیف من', url: '/dashboard/assignments' }],
            }),
            card(doc, 'sup-2', {
              navTitle: 'کانال — فنی',
              icon: { value: 'fas fa-life-ring', library: 'fa-solid' },
              title: 'پشتیبانی فنی',
              lead: 'مشکل در ورود، پخش ویدیو یا دانلود منابع.',
              bullets: ['بررسی مرورگر و اتصال', 'گزارش خطا با توضیح مراحل'],
              actions: [{ label: 'ارسال پیام', url: '/contact' }],
            }),
            card(doc, 'sup-3', {
              navTitle: 'کانال — سفارش',
              icon: { value: 'fas fa-receipt', library: 'fa-solid' },
              title: 'سفارش و پرداخت',
              lead: 'وضعیت سفارش، فاکتور و پیگیری پرداخت.',
              bullets: ['وضعیت در سفارش‌های من', 'استعلام گواهی به‌صورت عمومی'],
              actions: [{ label: 'سفارش‌های من', url: '/dashboard/orders' }, { label: 'استعلام گواهی', url: '/verify', variant: 'ghost' }],
            }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'کانال‌ها', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Support — کانال‌ها', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    faqBlock(doc, 'sup-faq', [...FAQ.courses, ...FAQ.commerce], { title: 'پیش از ارسال پیام', navTitle: 'Support — پرسش‌ها' }),
    ctaBand(doc, 'sup-cta', { title: 'هنوز مشکل دارید؟', body: 'شرح مشکل و نام دوره را بنویسید تا سریع‌تر بررسی شود.', primary: { label: 'ارسال پیام', url: '/contact' }, navTitle: 'Support — دعوت به اقدام' }),
  ];
}

/* ========================================================= VERIFICATION */
function verifyBuild(doc) {
  return [
    pageHero(doc, 'ver-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'استعلام گواهی', url: '/verify' }],
      kicker: 'استعلام',
      title: 'بررسی اصالت گواهی',
      lead: 'شناسهٔ درج‌شده روی گواهی را وارد کنید تا وضعیت اعتبار آن نمایش داده شود.',
      navTitle: 'Verify — سربرگ',
    }),
    section(
      doc,
      'ver-form',
      [
        container(
          doc,
          'ver-form-card',
          [
            heading(doc, 'ver-form-title', 'فرم استعلام', { level: 'h2', title: 'H2 — فرم استعلام' }),
            container(
              doc,
              'ver-form-mount',
              [shortcodeWidget(doc, 'ver-form-sc', sc('az_certificate_verify'), { title: 'فرم استعلام گواهی' })],
              { title: 'فرم استعلام', cls: 'az-form az-mount', g: 0 }
            ),
            paragraph(doc, 'ver-form-note', 'این فرم با بررسی nonce و کلید داده‌ها اجرا می‌شود؛ شناسهٔ نامعتبر پیام «پیدا نشد» دریافت می‌کند و هیچ دادهٔ حساسی نمایش داده نمی‌شود.', { size: 13, color: C.muted, cls: 'az-form-note' }),
          ],
          { title: 'کارت استعلام', cls: 'az-card az-stack', g: 14 }
        ),
      ],
      { title: 'Verify — فرم', cls: 'az-section', innerCls: 'az-wrap az-verify-wrap' }
    ),
    section(
      doc,
      'ver-states',
      [
        sectionHead(doc, 'ver-states', { title: 'وضعیت‌های احتمالی', lead: 'سه خروجی ممکن است؛ هر سه در این صفحه طراحی شده‌اند.' }),
        grid(
          doc,
          'ver-states-grid',
          [
            stateBlock(doc, 'ver-idle', { title: STATES.verificationIdle.title, body: STATES.verificationIdle.body, icon: 'fas fa-inbox', navTitle: 'وضعیت — پیش از جست‌وجو' }),
            stateBlock(doc, 'ver-ok', { tone: 'success', icon: 'fas fa-inbox', title: STATES.verificationValid.title, body: STATES.verificationValid.body, navTitle: 'وضعیت — معتبر' }),
            stateBlock(doc, 'ver-fail', { tone: 'danger', icon: 'fas fa-inbox', title: STATES.verificationNotFound.title, body: STATES.verificationNotFound.body, actions: [{ label: UI.verifyAgain, url: '/verify' }], navTitle: 'وضعیت — نامعتبر' }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'وضعیت‌ها', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Verify — وضعیت‌ها', cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
  ];
}

/* ================================================================ LEGAL */
function legalPageBuilder(slug, title, lead, sections, url) {
  return (doc) => [
    pageHero(doc, `${slug}-hero`, {
      crumbs: [{ label: 'خانه', url: '/' }, { label: title, url }],
      kicker: 'پیش‌نویس',
      title,
      lead,
      navTitle: `${title} — سربرگ`,
    }),
    section(
      doc,
      `${slug}-body`,
      [
        container(
          doc,
          `${slug}-notice`,
          [paragraph(doc, `${slug}-notice-text`, LEGAL_DRAFT_NOTICE, { size: 13.5, color: '#8A5A12', cls: 'az-form-note' })],
          { title: 'یادداشت حقوقی', cls: 'az-legal-notice', g: 0, bg: '#FBF0DC', border: { color: '#E7D2A8' }, radius: edge(14), padding: { unit: 'px', top: '12', right: '14', bottom: '12', left: '14', isLinked: false } }
        ),
        ...sections.map((s, i) =>
          proseBlock(doc, `${slug}-s-${i}`, { title: s.h, paragraphs: [s.p], level: 'h2', navTitle: `بخش — ${s.h}` })
        ),
      ],
      { title: `${title} — بدنه`, cls: 'az-section az-legal', innerCls: 'az-wrap' }
    ),
    ctaBand(doc, `${slug}-cta`, { title: 'پرسشی در این باره دارید؟', body: 'از صفحهٔ تماس پیام بدهید.', primary: { label: 'تماس با ما', url: '/contact' }, navTitle: `${title} — دعوت به اقدام` }),
  ];
}

/* ------------------------------------------------------------- registry */
export function registerPublic() {
  define(
    { slug: 'home', title: 'خانه', docType: 'page', group: 'Public', page: 'صفحهٔ اصلی', plugins: ['elementor', 'elementor-pro', 'learndash-lms'], dynamic: 'LearnDash course list + آخرین نوشته‌ها', url: '/', condition: 'تنظیم به‌عنوان صفحهٔ اصلی وردپرس', manual: 'تصویر Hero و تصاویر گالری را جایگزین کنید.', status: 'READY — NEEDS REAL CONTENT' },
    homeBuild
  );
  define(
    { slug: 'start-here', title: 'از کجا شروع کنم؟', docType: 'page', group: 'Public', page: '/start-here', plugins: ['elementor'], dynamic: '', url: '/start-here', condition: '', manual: '', status: 'READY — NEEDS REAL CONTENT' },
    startHereBuild
  );
  define(
    { slug: 'about', title: 'دربارهٔ کارگاه', docType: 'page', group: 'Public', page: '/about', plugins: ['elementor'], dynamic: '', url: '/about', condition: '', manual: 'روایت کارگاه و بخش «نسبت فن با سنت» با اطلاعات واقعی تکمیل شود.', status: 'READY — NEEDS REAL CONTENT' },
    aboutBuild
  );
  define(
    { slug: 'contact', title: 'تماس با ما', docType: 'page', group: 'Public', page: '/contact', plugins: ['elementor', 'elementor-pro'], dynamic: 'فرم المنتور پرو (در صورت نصب افزونه نقشه: ویجت نقشه)', url: '/contact', condition: '', manual: 'Action After Submit فرم و کلید API نقشه را تنظیم کنید.', status: 'READY — NEEDS REAL CONTENT' },
    contactBuild
  );
  define({ slug: 'works', title: 'آثار هنرجویان', docType: 'page', group: 'Public', page: '/works', plugins: ['elementor', 'bdthemes-element-pack-pro'], dynamic: 'Dynamic Grid روی CPT az_artwork', url: '/works', condition: '', manual: 'پس از Import، Loop Item اثر را در Dynamic Grid انتخاب کنید.', status: 'READY — NEEDS DYNAMIC BINDING' }, worksBuild);
  define({ slug: 'single-artwork', title: 'تک‌اثر — جزئیات', docType: 'single', group: 'Public', page: 'CPT az_artwork', plugins: ['elementor-pro'], dynamic: 'ACF: technique/materials/dimensions/gallery', url: '/works/{slug}', condition: 'Theme Builder → Single → Artwork (az_artwork)', manual: 'فیلدهای ACF را در ویجت‌های مربوط انتخاب کنید.', status: 'READY — NEEDS DYNAMIC BINDING' }, singleArtworkBuild);
  define({ slug: 'blog', title: 'مجله', docType: 'page', group: 'Public', page: '/blog', plugins: ['elementor'], dynamic: 'ویجت Posts', url: '/blog', condition: '', manual: 'اگر از Theme Builder استفاده می‌کنید، الگوی آرشیو را به نوشته‌ها متصل کنید.', status: 'READY' }, blogBuild);
  define({ slug: 'single-post', title: 'تک‌نوشته', docType: 'single', group: 'Public', page: 'نوشته‌ها', plugins: ['elementor-pro'], dynamic: 'محتوای نوشته', url: '/blog/{slug}', condition: 'Theme Builder → Single → Posts', manual: '', status: 'READY' }, singlePostBuild);
  define({ slug: 'instructors', title: 'مدرسان', docType: 'page', group: 'Public', page: '/instructors', plugins: ['elementor', 'bdthemes-element-pack-pro'], dynamic: 'Dynamic Grid روی CPT instructor', url: '/instructors', condition: '', manual: 'در صورت استفاده از CPT مدرس، Loop Item مربوط را انتخاب کنید.', status: 'READY — NEEDS DYNAMIC BINDING' }, instructorsBuild);
  define({ slug: 'single-instructor', title: 'تک‌مدرس', docType: 'single', group: 'Public', page: 'CPT instructor', plugins: ['elementor-pro'], dynamic: 'ACF: specialty/experience/biography/featured_courses', url: '/instructors/{slug}', condition: 'Theme Builder → Single → Instructor', manual: 'فیلدهای ACF را متصل کنید.', status: 'READY — NEEDS DYNAMIC BINDING' }, singleInstructorBuild);
  define({ slug: 'gallery', title: 'گالری کارگاه', docType: 'page', group: 'Public', page: '/gallery', plugins: ['elementor'], dynamic: '', url: '/gallery', condition: '', manual: 'تصاویر واقعی کارگاه را جایگزین کنید.', status: 'READY — NEEDS REAL CONTENT' }, galleryBuild);
  define({ slug: 'faq', title: 'پرسش‌های پرتکرار', docType: 'page', group: 'Public', page: '/faq', plugins: ['elementor'], dynamic: '', url: '/faq', condition: '', manual: 'پرسش‌ها را با پرسش‌های واقعی کارگاه تکمیل کنید.', status: 'READY — NEEDS REAL CONTENT' }, faqBuild);
  define({ slug: 'support', title: 'پشتیبانی', docType: 'page', group: 'Public', page: '/support', plugins: ['elementor'], dynamic: '', url: '/support', condition: '', manual: 'روش واقعی پاسخ‌گویی را جایگزین کنید.', status: 'READY — NEEDS REAL CONTENT' }, supportBuild);
  define({ slug: 'verify', title: 'استعلام گواهی', docType: 'page', group: 'Public', page: '/verify', plugins: ['kit-php'], dynamic: 'فرم استعلام با nonce', url: '/verify', condition: '', manual: 'نیازمند backend/asadzadeh-kit-shortcodes.php', status: 'NEEDS CUSTOM BACKEND' }, verifyBuild);

  const legalPages = [
    ['privacy', 'حریم خصوصی', 'نگه‌داری و استفاده از داده‌های کاربران.', LEGAL.privacy, '/privacy'],
    ['terms', 'شرایط استفاده', 'شرایط استفاده از سایت و خدمات آموزشی.', LEGAL.terms, '/terms'],
    ['rules', 'قوانین دوره و کلاس', 'قوانین دوره‌های آنلاین و کلاس‌های حضوری.', LEGAL.rules, '/rules'],
    ['refund', 'شرایط بازگشت وجه', 'سیاست انصراف و بازگشت وجه.', LEGAL.refund, '/refund'],
    ['shipping', 'ارسال و تحویل', 'روش ارسال کالا و تحویل حضوری.', LEGAL.shipping, '/shipping'],
  ];
  for (const [slug, title, lead, sections, url] of legalPages) {
    define(
      { slug, title, docType: 'page', group: 'Legal', page: url, plugins: ['elementor'], dynamic: '', url, condition: '', manual: 'پیش‌نویس حقوقی — پیش از انتشار بازبینی شود.', status: 'READY — NEEDS REAL CONTENT' },
      legalPageBuilder(slug, title, lead, sections, url)
    );
  }
}
