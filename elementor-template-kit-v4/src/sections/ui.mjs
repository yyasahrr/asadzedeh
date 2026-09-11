/**
 * Reusable section library.
 *
 * Every function returns Elementor containers that already carry:
 *  - meaningful `_title` (navigator readable, spec §34)
 *  - an `az-*` scoped class (spec §35)
 *  - responsive overrides for tablet + mobile (spec §10)
 *  - RTL-aware alignment
 */
import { C, FONT, edge, gap, LAYOUT } from '../tokens.mjs';
import {
  container,
  grid,
  heading,
  paragraph,
  button,
  kicker,
  iconList,
  accordion,
  iconBox,
  imageWidget,
  mediaFrame,
  videoSlot,
  shortcodeWidget,
  progressBar,
  testimonial,
  divider,
  spacer,
  patternStrip,
  alert as alertWidget,
  htmlBlock,
  linkText,
  searchForm,
  cell,
  section,
} from '../dom.mjs';
import { sc } from '../shortcodes.mjs';
import { CONTACT } from '../content/site.mjs';
import { UI } from '../content/copy.mjs';

/* ------------------------------------------------------------------ head */

export function breadcrumbs(doc, seed, items, opts = {}) {
  const crumbs = items.map((it, i) => {
    const isLast = i === items.length - 1;
    const inner = isLast
      ? `<span aria-current="page">${it.label}</span>`
      : `<a href="${it.url}">${it.label}</a>`;
    const sep = isLast ? '' : '<span class="az-sep" aria-hidden="true">›</span>';
    return `${inner}${sep}`;
  }).join('');
  return container(
    doc,
    `${seed}-crumbs`,
    [htmlBlock(doc, `${seed}-crumbs-html`, `<nav class="az-crumbs" aria-label="مسیر صفحه" dir="rtl">${crumbs}</nav>`, { title: 'مسیر صفحه', cls: 'az-crumbs-wrap' })],
    { title: 'مسیر صفحه', cls: 'az-crumbs-row', g: 0, ...opts }
  );
}

export function sectionHead(doc, seed, opts = {}) {
  const { kicker: k, title, lead, link = null, align = 'right', cls = '', showRule = true } = opts;
  return container(
    doc,
    `${seed}-head`,
    [
      k ? kicker(doc, `${seed}-kicker`, k) : null,
      title ? heading(doc, `${seed}-title`, title, { level: 'h2', title: `H2 — ${title}` }) : null,
      lead ? paragraph(doc, `${seed}-lead`, lead, { color: C.muted, size: 16, cls: 'az-lead', title: 'متن معرفی بخش' }) : null,
      showRule ? patternStrip(doc, `${seed}-rule`) : null,
      link ? linkText(doc, `${seed}-link`, `${link.label} ›`, link.url, { title: 'لینک بخش', cls: 'az-see-all' }) : null,
    ].filter(Boolean),
    { title: opts.navTitle || 'سربرگ بخش', cls: `az-section-head ${cls}`.trim(), align, g: 12 }
  );
}

/* ------------------------------------------------------------------ hero */

/**
 * Editorial hero. Copy + visual frame. No fake numeric stats (spec §12).
 */
export function hero(doc, seed, opts = {}) {
  const {
    kicker: k,
    title,
    lead,
    actions = [],
    meta = [],
    frameNote = 'قاب تصویر شاخص',
    frameSub = 'جایگزین شود با تصویر واقعی',
    variant = 'default',
    navTitle = 'Hero',
  } = opts;

  const actionsRow = actions.length
    ? container(
        doc,
        `${seed}-actions`,
        actions.map((a, i) =>
          button(doc, `${seed}-action-${i}`, a.label, a.url || '#', {
            variant: a.variant || (i === 0 ? 'primary' : 'outline'),
            block: true,
            title: `CTA — ${a.label}`,
          })
        ),
        {
          title: 'دکمه‌های اقدام',
          cls: 'az-row az-hero__actions',
          direction: 'row',
          wrap: 'wrap',
          g: 12,
          responsive: {
            mobile: { flex_direction: 'column', flex_wrap: 'wrap' },
          },
        }
      )
    : null;

  const metaRow = meta.length
    ? container(
        doc,
        `${seed}-meta`,
        meta.map((m, i) =>
          container(doc, `${seed}-meta-${i}`, [paragraph(doc, `${seed}-metatext-${i}`, m, { size: 14, color: C.muted, cls: 'az-badge', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], {
            title: `متا — ${m.slice(0, 22)}`,
            cls: 'az-inline-badge',
            g: 0,
          })
        ),
        { title: 'متاداده', cls: 'az-row az-hero__meta', direction: 'row', wrap: 'wrap', g: 8 }
      )
    : null;

  const copy = container(
    doc,
    `${seed}-copy`,
    [
      k ? kicker(doc, `${seed}-kicker`, k) : null,
      heading(doc, `${seed}-h1`, title, { level: 'h1', title: 'H1 — عنوان صفحه' }),
      lead ? paragraph(doc, `${seed}-lead`, lead, { size: 17, color: C.muted, cls: 'az-hero__lead', title: 'متن معرفی' }) : null,
      metaRow,
      actionsRow,
    ].filter(Boolean),
    { title: `${navTitle} — متن`, cls: 'az-stack az-hero__copy', g: 16 }
  );

  const visual = container(
    doc,
    `${seed}-visual`,
    [mediaFrame(doc, `${seed}-frame`, { label: frameNote, note: frameSub, ratio: variant === 'wide' ? '16 / 9' : '4 / 5', title: 'قاب تصویر Hero' })],
    { title: `${navTitle} — تصویر`, cls: 'az-hero__visual', g: 0 }
  );

  return section(
    doc,
    seed,
    [
      container(doc, `${seed}-grid`, [copy, visual], {
        title: `${navTitle} — شبکه`,
        cls: 'az-hero__grid',
        direction: 'row',
        wrap: 'wrap',
        g: 34,
        align: 'center',
        responsive: {
          tablet: { flex_direction: 'row', flex_wrap: 'wrap' },
          mobile: { flex_direction: 'column', flex_wrap: 'wrap' },
        },
      }),
    ],
    { title: navTitle, cls: 'az-section az-hero', innerCls: 'az-wrap', bg: C.bg }
  );
}

/** Internal page hero: breadcrumb + H1 + lead + meta (no giant visual). */
export function pageHero(doc, seed, opts = {}) {
  const { crumbs = [], kicker: k, title, lead, meta = [], actions = [], navTitle = 'سربرگ صفحه' } = opts;
  return section(
    doc,
    seed,
    [
      crumbs.length ? breadcrumbs(doc, `${seed}`, crumbs) : null,
      container(
        doc,
        `${seed}-body`,
        [
          k ? kicker(doc, `${seed}-kicker`, k) : null,
          heading(doc, `${seed}-h1`, title, { level: 'h1', title: 'H1 — عنوان صفحه' }),
          lead ? paragraph(doc, `${seed}-lead`, lead, { size: 16.5, color: C.muted, cls: 'az-lead' }) : null,
          meta.length
            ? container(
                doc,
                `${seed}-meta`,
                meta.map((m, i) =>
                  container(doc, `${seed}-m-${i}`, [paragraph(doc, `${seed}-mt-${i}`, m, { size: 13.5, color: C.muted, cls: 'az-badge', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], { title: `متا — ${m.slice(0, 20)}`, cls: 'az-inline-badge', g: 0 })
                ),
                { title: 'متاداده', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 8 }
              )
            : null,
          actions.length
            ? container(
                doc,
                `${seed}-actions`,
                actions.map((a, i) => button(doc, `${seed}-a-${i}`, a.label, a.url || '#', { variant: a.variant || (i === 0 ? 'primary' : 'outline'), block: true, title: `CTA — ${a.label}` })),
                { title: 'دکمه‌های اقدام', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }
              )
            : null,
        ].filter(Boolean),
        { title: `${navTitle} — محتوا`, cls: 'az-stack', g: 14 }
      ),
    ].filter(Boolean),
    { title: navTitle, cls: 'az-section az-section--tight az-page-hero', innerCls: 'az-wrap' }
  );
}

/* ----------------------------------------------------------------- cards */

export function metaRow(doc, seed, items, opts = {}) {
  return container(
    doc,
    `${seed}-metarow`,
    items.map((m, i) =>
      container(doc, `${seed}-m-${i}`, [paragraph(doc, `${seed}-mt-${i}`, m, { size: 13, color: C.muted, cls: opts.badge ? 'az-badge' : '', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], {
        title: `متا — ${String(m).slice(0, 20)}`,
        cls: 'az-inline-badge',
        g: 0,
      })
    ),
    { title: opts.title || 'متاداده', cls: `az-row ${opts.cls || ''}`.trim(), direction: 'row', wrap: 'wrap', g: 8 }
  );
}

export function card(doc, seed, opts = {}) {
  const {
    title,
    lead,
    meta = [],
    bullets = [],
    actions = [],
    variant = '',
    frame = null,
    navTitle = 'کارت',
    icon = null,
  } = opts;
  return container(
    doc,
    seed,
    [
      frame ? mediaFrame(doc, `${seed}-frame`, { label: frame.label || 'تصویر', note: frame.note || '', ratio: frame.ratio || '4 / 3', title: 'قاب تصویر کارت' }) : null,
      icon ? iconBox(doc, `${seed}-icon`, { icon, title, description: lead || '', navTitle: 'آیتم', cls: 'az-iconbox' }) : null,
      !icon && title ? heading(doc, `${seed}-title`, title, { level: 'h3', cls: 'az-card__title', title: `H3 — ${title}` }) : null,
      !icon && lead ? paragraph(doc, `${seed}-lead`, lead, { size: 14.5, color: C.muted, title: 'توضیح کارت' }) : null,
      meta.length ? metaRow(doc, `${seed}`, meta, { title: 'متادادهٔ کارت' }) : null,
      bullets.length ? iconList(doc, `${seed}-bullets`, bullets, { title: 'ویژگی‌ها', size: 13, gapSize: 8 }) : null,
      actions.length
        ? container(
            doc,
            `${seed}-actions`,
            actions.map((a, i) => button(doc, `${seed}-a-${i}`, a.label, a.url || '#', { variant: a.variant || (i === 0 ? 'primary' : 'ghost'), block: false, size: 'sm', title: `CTA — ${a.label}` })),
            { title: 'اقدام‌های کارت', cls: 'az-row az-card__actions', direction: 'row', wrap: 'wrap', g: 8, responsive: { mobile: { flex_direction: 'column' } } }
          )
        : null,
    ].filter(Boolean),
    { title: navTitle, cls: `az-card ${variant}`.trim(), g: 12, justify: 'space-between' }
  );
}

export function courseCard(doc, seed, course, opts = {}) {
  return card(doc, seed, {
    navTitle: `کارت دوره — ${course.title}`,
    frame: { label: course.category, note: 'جای تصویر دوره', ratio: '4 / 3' },
    title: course.title,
    lead: course.excerpt,
    meta: [course.level, course.duration, course.category],
    actions: [{ label: 'جزئیات دوره', url: `/courses/${course.slug}`, variant: 'primary' }],
    ...opts,
  });
}

export function pathCard(doc, seed, path, opts = {}) {
  return card(doc, seed, {
    navTitle: `کارت مسیر — ${path.title}`,
    variant: `az-card--${path.accent === 'navy' ? 'navy' : path.accent === 'red' ? 'cream' : ''}`.trim(),
    title: path.title,
    lead: path.summary,
    meta: [path.stages, path.courseCount, path.totalDuration],
    actions: [{ label: 'مشاهدهٔ مسیر', url: `/learning-paths/${path.slug}`, variant: 'primary' }],
    ...opts,
  });
}

export function workshopCard(doc, seed, w, opts = {}) {
  return card(doc, seed, {
    navTitle: `کارت کلاس — ${w.title}`,
    frame: { label: 'کلاس حضوری', note: 'جای تصویر کلاس', ratio: '4 / 3' },
    title: w.title,
    lead: `${w.days} — ${w.time}`,
    meta: [w.start, w.sessions, w.location, w.seats],
    actions: [{ label: UI.registerWorkshop, url: `/workshops/${w.slug}`, variant: 'accent' }],
    ...opts,
  });
}

export function instructorCard(doc, seed, ins, opts = {}) {
  return card(doc, seed, {
    navTitle: `کارت مدرس — ${ins.role}`,
    frame: { label: ins.role, note: 'جای تصویر مدرس', ratio: '1 / 1' },
    title: ins.name,
    lead: ins.specialty,
    meta: [ins.role, ins.experience],
    actions: [{ label: 'مشاهدهٔ صفحه', url: `/instructors/${ins.slug}`, variant: 'ghost' }],
    ...opts,
  });
}

export function artworkCard(doc, seed, art, opts = {}) {
  return card(doc, seed, {
    navTitle: `کارت اثر — ${art.technique}`,
    frame: { label: art.technique, note: 'جای تصویر اثر', ratio: '1 / 1' },
    title: art.title,
    lead: art.materials,
    meta: [art.dimensions, art.year],
    actions: [{ label: 'مشاهدهٔ اثر', url: '/works', variant: 'ghost' }],
    ...opts,
  });
}

/* ------------------------------------------------------------- plugin UX */

/**
 * Styled plugin mount: intro copy + the real plugin output + a documented
 * fallback note. Never a bare shortcode alone (spec §43).
 */
export function mount(doc, seed, opts = {}) {
  const {
    title = null,
    lead = null,
    code,
    navTitle = 'اتصال افزونه',
    note = null,
    before = [],
    after = [],
    cls = 'az-mount',
    variant = '',
  } = opts;
  return container(
    doc,
    seed,
    [
      title ? heading(doc, `${seed}-title`, title, { level: 'h2', title: `H2 — ${title}` }) : null,
      lead ? paragraph(doc, `${seed}-lead`, lead, { size: 16, color: C.muted }) : null,
      ...before,
      container(
        doc,
        `${seed}-mount`,
        [shortcodeWidget(doc, `${seed}-sc`, code, { title: navTitle })],
        { title: navTitle, cls: `${cls} ${variant}`.trim(), g: 0 }
      ),
      ...after,
      note
        ? container(doc, `${seed}-note`, [paragraph(doc, `${seed}-notetext`, note, { size: 13, color: C.muted, cls: 'az-form-note' })], {
            title: 'یادداشت اجرا',
            cls: 'az-mount-note',
            g: 0,
            padding: { unit: 'px', top: '10', right: '14', bottom: '10', left: '14', isLinked: false },
            bg: C.surfaceAlt,
            radius: edge(12),
            border: { color: C.line },
          })
        : null,
    ].filter(Boolean),
    { title: navTitle, cls: 'az-mount-block az-stack', g: 14 }
  );
}

/** Dashboard stat tiles driven by real data only (no hardcoded numbers). */
export function statTiles(doc, seed, opts = {}) {
  const { code = sc('az_dashboard_stats'), navTitle = 'آمار داشبورد' } = opts;
  return container(
    doc,
    seed,
    [shortcodeWidget(doc, `${seed}-sc`, code, { title: navTitle })],
    { title: navTitle, cls: 'az-tiles az-mount', g: 0 }
  );
}

/* ---------------------------------------------------------------- states */

export function stateBlock(doc, seed, opts = {}) {
  const {
    tone = 'neutral',
    icon = 'fas fa-inbox',
    title,
    body,
    actions = [],
    navTitle = 'وضعیت',
    cls = '',
    level = 'h3',
  } = opts;
  return container(
    doc,
    seed,
    [
      container(doc, `${seed}-icon`, [htmlBlock(doc, `${seed}-iconhtml`, `<span aria-hidden="true">${iconGlyph(icon)}</span>`, { title: 'آیکون وضعیت', cls: 'az-state-icon-glyph' })], {
        title: 'آیکون وضعیت',
        cls: 'az-state__icon',
        g: 0,
      }),
      heading(doc, `${seed}-title`, title, { level, align: 'center', title: `${level.toUpperCase()} — ${title}` }),
      paragraph(doc, `${seed}-body`, body, { align: 'center', color: C.muted, size: 15 }),
      actions.length
        ? container(
            doc,
            `${seed}-actions`,
            actions.map((a, i) => button(doc, `${seed}-a-${i}`, a.label, a.url || '#', { variant: a.variant || (i === 0 ? 'primary' : 'ghost'), block: true, title: `CTA — ${a.label}` })),
            { title: 'اقدام‌های وضعیت', cls: 'az-row', direction: 'row', wrap: 'wrap', justify: 'center', g: 10, responsive: { mobile: { flex_direction: 'column' } } }
          )
        : null,
    ].filter(Boolean),
    { title: navTitle, cls: `az-state az-state--${tone} ${cls}`.trim(), align: 'center', g: 14 }
  );
}

export function emptyState(doc, seed, state, opts = {}) {
  return stateBlock(doc, seed, {
    tone: 'neutral',
    icon: 'fas fa-seedling',
    title: state.title,
    body: state.body,
    actions: [{ label: state.cta, url: state.url }],
    navTitle: opts.navTitle || 'وضعیت خالی',
  });
}

/* ---------------------------------------------------------------- layout */

export function ctaBand(doc, seed, opts = {}) {
  const { title, body, primary = null, secondary = null, variant = 'navy', navTitle = 'دعوت به اقدام' } = opts;
  return section(
    doc,
    seed,
    [
      container(
        doc,
        `${seed}-inner`,
        [
          heading(doc, `${seed}-title`, title, { level: 'h2', align: 'right', title: `H2 — ${title}` }),
          body ? paragraph(doc, `${seed}-body`, body, { size: 16, color: variant === 'navy' ? 'rgba(255,248,236,.82)' : C.muted }) : null,
          container(
            doc,
            `${seed}-actions`,
            [primary ? button(doc, `${seed}-p`, primary.label, primary.url || '#', { variant: 'accent', block: true, title: `CTA — ${primary.label}` }) : null,
             secondary ? button(doc, `${seed}-s`, secondary.label, secondary.url || '#', { variant: 'ghost', block: true, title: `CTA — ${secondary.label}` }) : null].filter(Boolean),
            { title: 'دکمه‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }
          ),
        ].filter(Boolean),
        { title: `${navTitle} — محتوا`, cls: 'az-stack', g: 14 }
      ),
    ],
    { title: navTitle, cls: 'az-section az-section--tight az-cta-band', innerCls: 'az-wrap az-card az-card--navy', bg: variant === 'navy' ? C.navy : C.cream }
  );
}

export function faqBlock(doc, seed, items, opts = {}) {
  const { title = 'پرسش‌های پرتکرار', lead = null, navTitle = 'پرسش‌های پرتکرار' } = opts;
  return section(
    doc,
    seed,
    [
      sectionHead(doc, `${seed}`, { title, lead: lead || undefined, showRule: false }),
      container(doc, `${seed}-acc`, [accordion(doc, `${seed}-acc-widget`, items, { title: 'آکاردئون پرسش‌ها' })], { title: 'آکاردئون', cls: 'az-acc-wrap', g: 0 }),
    ],
    { title: navTitle, cls: 'az-section az-faq', innerCls: 'az-wrap', bg: C.surface }
  );
}

export function roadmap(doc, seed, items, opts = {}) {
  const { title = 'مسیر یادگیری', lead = null, navTitle = 'نقشه راه' } = opts;
  return section(
    doc,
    seed,
    [
      sectionHead(doc, seed, { title, lead: lead || undefined }),
      container(
        doc,
        `${seed}-steps`,
        items.map((it, i) =>
          container(
            doc,
            `${seed}-step-${i}`,
            [
              container(doc, `${seed}-stepn-${i}`, [paragraph(doc, `${seed}-stepnt-${i}`, toPersianNum(i + 1), { align: 'center', color: '#FFF3E1', size: 16, weight: '700', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], {
                title: `شمارهٔ مرحله ${i + 1}`,
                cls: 'az-step__n',
                g: 0,
                justify: 'center',
                align: 'center',
                bg: C.navy,
                radius: edge(14),
              }),
              container(
                doc,
                `${seed}-stepb-${i}`,
                [
                  heading(doc, `${seed}-stept-${i}`, it.title, { level: 'h4', title: `H4 — ${it.title}` }),
                  paragraph(doc, `${seed}-stepd-${i}`, it.body, { size: 15, color: C.muted, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }),
                ],
                { title: `متن مرحله ${i + 1}`, cls: 'az-step__body', g: 4 }
              ),
            ],
            { title: `مرحله ${i + 1}`, cls: 'az-step', direction: 'row', g: 16, align: 'start' }
          )
        ),
        { title: 'مراحل', cls: 'az-steps', g: 0 }
      ),
    ],
    { title: navTitle, cls: 'az-section az-roadmap', innerCls: 'az-wrap' }
  );
}

export function galleryBlock(doc, seed, items, opts = {}) {
  const { title = 'گالری', lead = null, variant = '', navTitle = 'گالری' } = opts;
  return section(
    doc,
    seed,
    [
      sectionHead(doc, seed, { title, lead: lead || undefined }),
      container(
        doc,
        `${seed}-grid`,
        items.map((it, i) => mediaFrame(doc, `${seed}-g-${i}`, { label: it.label || 'تصویر', note: it.note || '', ratio: '1 / 1', title: `قاب گالری ${i + 1}` })),
        { title: 'شبکهٔ گالری', cls: `az-gallery ${variant}`.trim(), direction: 'row', wrap: 'wrap', g: 14 }
      ),
    ],
    { title: navTitle, cls: 'az-section az-gallery-section', innerCls: 'az-wrap', bg: C.surface }
  );
}

export function testimonialRow(doc, seed, items, opts = {}) {
  const { title = 'تجربهٔ هنرجویان', lead = null, navTitle = 'تجربهٔ هنرجویان' } = opts;
  return section(
    doc,
    seed,
    [
      sectionHead(doc, seed, { title, lead: lead || undefined }),
      grid(
        doc,
        `${seed}-grid`,
        items.map((t, i) => testimonial(doc, `${seed}-t-${i}`, { quote: t.quote, name: t.name, role: t.role, title: `تأییدیه ${i + 1}` })),
        { cols: 3, tablet: 2, mobile: 1, title: 'تأییدیه‌ها', cls: 'az-grid az-grid--3' }
      ),
    ],
    { title: navTitle, cls: 'az-section az-testimonials', innerCls: 'az-wrap', bg: C.surface }
  );
}

export function trustStrip(doc, seed, items, opts = {}) {
  const { title = 'آنچه در این کارگاه می‌گیرید', navTitle = 'نوار اعتماد', note = null } = opts;
  return section(
    doc,
    seed,
    [
      sectionHead(doc, seed, { title, showRule: false }),
      container(
        doc,
        `${seed}-row`,
        items.map((it, i) =>
          container(
            doc,
            `${seed}-i-${i}`,
            [iconList(doc, `${seed}-il-${i}`, [it], { title: `مورد ${i + 1}`, size: 14, gapSize: 8, color: C.teal })],
            { title: `مورد ${i + 1}`, cls: 'az-trust-item', g: 0 }
          )
        ),
        { title: 'موارد', cls: 'az-grid az-grid--2', direction: 'row', wrap: 'wrap', g: 14 }
      ),
      note ? paragraph(doc, `${seed}-note`, note, { size: 13, color: C.muted, cls: 'az-form-note' }) : null,
    ].filter(Boolean),
    { title: navTitle, cls: 'az-section az-section--tight az-trust', innerCls: 'az-wrap', bg: C.surfaceAlt }
  );
}

/* ------------------------------------------------------------- dashboard */

export function dashboardShell(doc, seed, opts = {}) {
  const { active = 'dashboard', nav = [], title = null, lead = null, children = [], navTitle = 'پنل هنرجو' } = opts;
  const navLinks = nav.map((item) => ({
    ...item,
    current: item.url.endsWith(`/${active}`) || (active === 'dashboard' && item.url === '/dashboard'),
  }));

  const sidebar = container(
    doc,
    `${seed}-nav`,
    navLinks.map((item) =>
      container(
        doc,
        `${seed}-navitem-${item.label}`,
        [htmlBlock(doc, `${seed}-navhtml-${item.label}`, `<a href="${item.url}"${item.current ? ' aria-current="page"' : ''} dir="rtl">${item.label}</a>`, { title: `لینک — ${item.label}`, cls: 'az-dash-link' })],
        { title: `لینک پنل — ${item.label}`, cls: 'az-dash__navitem', g: 0 }
      )
    ),
    { title: 'ناوبری پنل', cls: 'az-dash__nav', g: 4 }
  );

  const content = container(
    doc,
    `${seed}-content`,
    [
      title ? heading(doc, `${seed}-title`, title, { level: 'h1', title: 'H1 — عنوان پنل' }) : null,
      lead ? paragraph(doc, `${seed}-lead`, lead, { size: 16, color: C.muted }) : null,
      ...children,
    ].filter(Boolean),
    { title: 'محتوای پنل', cls: 'az-dash__content az-stack', g: 22 }
  );

  return section(
    doc,
    seed,
    [
      container(doc, `${seed}-grid`, [sidebar, content], {
        title: 'شبکهٔ پنل',
        cls: 'az-dash',
        direction: 'row',
        wrap: 'wrap',
        g: 30,
        align: 'start',
        responsive: {
          tablet: { flex_direction: 'row', flex_wrap: 'wrap' },
          mobile: { flex_direction: 'column', flex_wrap: 'wrap' },
        },
      }),
    ],
    { title: navTitle, cls: 'az-section az-dashboard', innerCls: 'az-wrap' }
  );
}

/* -------------------------------------------------------------- learning */

export function curriculumBlock(doc, seed, opts = {}) {
  const {
    title = 'سرفصل دوره',
    lead = null,
    items = [],
    code = null,
    navTitle = 'سرفصل دوره',
  } = opts;
  const rows = items.map((it, i) =>
    container(
      doc,
      `${seed}-item-${i}`,
      [
        container(
          doc,
          `${seed}-n-${i}`,
          [paragraph(doc, `${seed}-nt-${i}`, it.locked ? '🔒' : toPersianNum(i + 1), { align: 'center', size: 14, weight: '700', color: it.locked ? C.muted : C.navy, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })],
          { title: `نشان ${i + 1}`, cls: 'az-ld-item__n', g: 0, justify: 'center', align: 'center', bg: it.locked ? C.surfaceAlt : C.cream }
        ),
        container(
          doc,
          `${seed}-g-${i}`,
          [
            paragraph(doc, `${seed}-t-${i}`, it.title, { size: 15.5, weight: '700', color: it.locked ? C.muted : C.navy, cls: 'az-ld-item__title', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }),
            it.meta ? paragraph(doc, `${seed}-m-${i}`, it.meta, { size: 13, color: C.muted, cls: 'az-ld-item__meta', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }) : null,
          ].filter(Boolean),
          { title: `متن آیتم ${i + 1}`, cls: 'az-ld-item__grow', g: 2 }
        ),
        it.badge
          ? container(doc, `${seed}-b-${i}`, [paragraph(doc, `${seed}-bt-${i}`, it.badge, { size: 12.5, weight: '700', color: it.badge === UI.free ? '#1D5A6B' : C.muted, cls: `az-badge ${it.badge === UI.free ? 'az-badge--info' : 'az-badge--neutral'}`, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], { title: `برچسب ${i + 1}`, cls: 'az-ld-item__badge', g: 0 })
          : null,
      ].filter(Boolean),
      {
        title: `آیتم ${i + 1}`,
        cls: `az-ld-item${it.locked ? ' az-ld-item--locked' : ''}${it.current ? ' az-ld-item--current' : ''}`,
        direction: 'row',
        align: 'center',
        g: 12,
      }
    )
  );

  return section(
    doc,
    seed,
    [
      sectionHead(doc, seed, { title, lead: lead || undefined }),
      code ? shortcodeWidget(doc, `${seed}-dyn`, code, { title: 'سرفصل داینامیک LearnDash' }) : null,
      container(doc, `${seed}-list`, rows, { title: 'فهرست سرفصل', cls: 'az-ld-list', g: 10 }),
    ].filter(Boolean),
    { title: navTitle, cls: 'az-section az-curriculum', innerCls: 'az-wrap' }
  );
}

export function progressBlock(doc, seed, opts = {}) {
  const { percent = 0, label = 'پیشرفت دوره', code = null, navTitle = 'پیشرفت' } = opts;
  return container(
    doc,
    seed,
    [
      container(doc, `${seed}-label`, [paragraph(doc, `${seed}-labeltext`, label, { size: 13, color: C.muted, cls: 'az-progress-label', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } })], { title: 'برچسب پیشرفت', cls: 'az-progress-label-row', g: 0 }),
      code ? shortcodeWidget(doc, `${seed}-dyn`, code, { title: 'پیشرفت واقعی LearnDash', cls: 'az-mount az-progress-mount' }) : progressBar(doc, `${seed}-bar`, { percent, label }),
    ],
    { title: navTitle, cls: 'az-progress-block', g: 6 }
  );
}

/* --------------------------------------------------------------- content */

export function proseBlock(doc, seed, opts = {}) {
  const { title = null, paragraphs = [], bullets = null, level = 'h2', navTitle = 'محتوای متنی' } = opts;
  return container(
    doc,
    seed,
    [
      title ? heading(doc, `${seed}-title`, title, { level, title: `${level.toUpperCase()} — ${title}` }) : null,
      ...paragraphs.map((p, i) => paragraph(doc, `${seed}-p-${i}`, p, { size: 15.5, title: `پاراگراف ${i + 1}` })),
      bullets ? iconList(doc, `${seed}-bullets`, bullets, { title: 'فهرست نکته‌ها' }) : null,
    ].filter(Boolean),
    { title: navTitle, cls: 'az-prose az-stack', g: 12 }
  );
}

export function tableBlock(doc, seed, opts = {}) {
  const { headers = [], rows = [], title = null, caption = null, navTitle = 'جدول' } = opts;
  const html = `
<div class="az-table-wrap" dir="rtl">
  <table>
    ${caption ? `<caption class="az-visually-hidden">${caption}</caption>` : ''}
    <thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((cell, i) => (i === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`)).join('')}</tr>`).join('')}</tbody>
  </table>
</div>`.trim();
  return container(
    doc,
    seed,
    [
      title ? heading(doc, `${seed}-title`, title, { level: 'h2', title: `H2 — ${title}` }) : null,
      htmlBlock(doc, `${seed}-table`, html, { title: 'جدول واکنش‌گرا', cls: 'az-table-block' }),
    ].filter(Boolean),
    { title: navTitle, cls: 'az-table-section az-stack', g: 14 }
  );
}

export function contactPanel(doc, seed, opts = {}) {
  const { title = 'راه‌های ارتباط', navTitle = 'اطلاعات تماس' } = opts;
  const rows = [
    { icon: 'fas fa-phone', label: 'تلفن', value: `<a href="${CONTACT.phoneHref}" dir="ltr">${CONTACT.phone}</a>` },
    { icon: 'fas fa-mobile-screen', label: 'همراه', value: `<span dir="ltr">${CONTACT.mobile}</span>` },
    { icon: 'fas fa-envelope', label: 'ایمیل', value: `<a href="mailto:${CONTACT.email}" dir="ltr">${CONTACT.email}</a>` },
    { icon: 'fas fa-location-dot', label: 'نشانی', value: CONTACT.address },
    { icon: 'fas fa-clock', label: 'ساعات کاری', value: `${CONTACT.hoursWeek}<br>${CONTACT.hoursThu}<br>${CONTACT.hoursFri}` },
  ];
  return container(
    doc,
    seed,
    [
      heading(doc, `${seed}-title`, title, { level: 'h2', title: `H2 — ${title}` }),
      container(
        doc,
        `${seed}-rows`,
        rows.map((r, i) =>
          container(
            doc,
            `${seed}-row-${i}`,
            [
              container(doc, `${seed}-ico-${i}`, [htmlBlock(doc, `${seed}-icoh-${i}`, `<span aria-hidden="true">${iconGlyph(r.icon)}</span>`, { title: 'آیکون', cls: 'az-contact-icon' })], {
                title: `آیکون ${r.label}`,
                cls: 'az-contact-icon-cell',
                g: 0,
                bg: C.cream,
                radius: edge(12),
                align: 'center',
                justify: 'center',
              }),
              container(
                doc,
                `${seed}-txt-${i}`,
                [
                  paragraph(doc, `${seed}-lbl-${i}`, r.label, { size: 13, color: C.muted, cls: 'az-contact-label', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }),
                  paragraph(doc, `${seed}-val-${i}`, r.value, { size: 15.5, weight: '600', margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }),
                ],
                { title: `متن ${r.label}`, cls: 'az-contact-text', g: 0 }
              ),
            ],
            { title: `ردیف ${r.label}`, cls: 'az-contact-row', direction: 'row', g: 12, align: 'center' }
          )
        ),
        { title: 'ردیف‌های تماس', cls: 'az-stack az-contact-rows', g: 12 }
      ),
      paragraph(doc, `${seed}-resp`, CONTACT.response, { size: 13.5, color: C.muted, cls: 'az-form-note' }),
    ],
    { title: navTitle, cls: 'az-card az-contact-panel az-stack', g: 14 }
  );
}

export function mapPanel(doc, seed, opts = {}) {
  const { title = 'موقعیت کارگاه', navTitle = 'نقشه' } = opts;
  return container(
    doc,
    seed,
    [
      heading(doc, `${seed}-title`, title, { level: 'h2', title: `H2 — ${title}` }),
      container(doc, `${seed}-map`, [shortcodeWidget(doc, `${seed}-mapw`, sc('az_workshop_meta', { field: 'map' }), { title: 'نقشه (در صورت نصب افزونه نقشه)' })], {
        title: 'نقشه نشان',
        cls: 'az-map-frame',
        g: 0,
        minHeight: 320,
        radius: edge(18),
        bg: C.cream,
        overflow: 'hidden',
        customCss: `selector{ position:relative; }\nselector::after{ content:"${CONTACT.mapNote}"; position:absolute; inset:auto 12px 12px 12px; font-size:12.5px; color:${C.muted}; background:${C.surface}; border-radius:10px; padding:8px 10px; }`,
      }),
      paragraph(doc, `${seed}-addr`, CONTACT.address, { size: 14.5, color: C.muted, cls: 'az-form-note' }),
    ],
    { title: navTitle, cls: 'az-map-panel az-stack', g: 12 }
  );
}

export function searchBlock(doc, seed, opts = {}) {
  const { title = 'جست‌وجو', placeholder = 'دوره، مقاله، کلاس یا محصول', navTitle = 'جست‌وجو', level = 'h2' } = opts;
  return container(
    doc,
    seed,
    [
      heading(doc, `${seed}-title`, title, { level, title: `${level.toUpperCase()} — جست‌وجو` }),
      searchForm(doc, `${seed}-form`, { placeholder }),
    ],
    { title: navTitle, cls: 'az-search-block az-stack', g: 12 }
  );
}

/* -------------------------------------------------------------- helpers */

function iconGlyph(icon) {
  const map = {
    'fas fa-inbox': '✉',
    'fas fa-seedling': '🌱',
    'fas fa-phone': '☎',
    'fas fa-mobile-screen': '📱',
    'fas fa-envelope': '✉',
    'fas fa-location-dot': '📍',
    'fas fa-clock': '🕘',
    'fas fa-check': '✓',
  };
  return map[icon] || '•';
}

export function toPersianNum(value) {
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(value).replace(/\d/g, (d) => persian[Number(d)]);
}

/** Re-exported so page modules can import the section wrapper from here too. */
export { section } from '../dom.mjs';
