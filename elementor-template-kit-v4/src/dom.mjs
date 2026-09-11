/**
 * Elementor document + element builders.
 *
 * Guarantees enforced here (so no page can accidentally regress):
 *  - every element gets a stable unique id
 *  - every element gets `_title` (spec §34: no "Container #123")
 *  - every element gets a scoped `az-*` class
 *  - responsive overrides are emitted as native *_tablet / *_mobile controls (spec §10)
 *  - containers are flex-based (spec §34)
 *  - no `__globals__` is ever emitted (spec §44)
 */
import { C, FONT, TYPE, LAYOUT, edge, gap, clamp, typeRule } from './tokens.mjs';
import { resolveSettings, recordUsage } from './schema.mjs';

/* ------------------------------------------------------------------ ids */
const ALPHABET = 'abcdef0123456789';
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
function eid(seed, salt = '') {
  let out = hash(`${seed}::${salt}`);
  while (out.length < 7) out += hash(out + seed).slice(0, 7);
  return out.slice(0, 7);
}

export class Doc {
  constructor(slug) {
    this.slug = slug;
    this.ids = new Set();
    this.titles = new Map();
    this.notes = [];
  }
  id(seed) {
    let candidate = eid(`${this.slug}/${seed}`);
    let n = 0;
    while (this.ids.has(candidate)) candidate = eid(`${this.slug}/${seed}`, String(++n));
    this.ids.add(candidate);
    return candidate;
  }
  /** Keeps navigator titles unique & meaningful. */
  title(base, seed) {
    const n = (this.titles.get(base) || 0) + 1;
    this.titles.set(base, n);
    return n === 1 ? base : `${base} ${n}`;
  }
}

/* ------------------------------------------------------- responsive merge */
/**
 * `resp({ a: 1 }, { tablet: { a: 2 }, mobile: { a: 3 } })`
 *   -> { a: 1, a_tablet: 2, a_mobile: 3 }
 */
export function resp(base = {}, overrides = {}) {
  const out = { ...base };
  for (const bp of ['widescreen', 'laptop', 'tablet_extra', 'tablet', 'mobile_extra', 'mobile']) {
    const values = overrides[bp];
    if (!values) continue;
    for (const [k, v] of Object.entries(values)) out[`${k}_${bp}`] = v;
  }
  return out;
}

/**
 * Cell width for flex grids.
 * Elementor stores responsive values as SIBLING controls with a suffix
 * (`width`, `width_tablet`, `width_mobile`) — nesting them inside one object
 * silently breaks the grid, which is exactly the kind of bug that makes a
 * "responsive" kit collapse on mobile.
 */
export function cell(cols, { tablet = null, mobile = 100, lg = null } = {}) {
  const pct = (n) => ({ unit: '%', size: `${(100 / n).toFixed(4)}` });
  return {
    base: pct(lg || cols),
    tablet: tablet ? pct(tablet) : null,
    mobile: mobile ? pct(mobile) : null,
  };
}

/* --------------------------------------------------------------- element */
function base(doc, seed, settings, title, cls) {
  const s = { ...settings };
  if (title) s._title = doc.title(title, seed);
  if (cls) s._css_classes = cls;
  return s;
}

/**
 * Generic widget. `type` must exist in src/schema.mjs registry (validator enforces).
 */
export function widget(doc, seed, type, settings = {}, meta = {}) {
  const { title, cls } = meta;
  recordUsage(type);
  return {
    id: doc.id(seed),
    elType: 'widget',
    isInner: false,
    widgetType: type,
    settings: base(doc, seed, resolveSettings(type, settings), title, cls),
    elements: [],
  };
}

/* ------------------------------------------------------------- container */
/**
 * Flex container. `layout` supports: direction, wrap, justify, align, gap, cols,
 * width (%), padding, radius, bg, border, shadow, sticky.
 */
export function container(doc, seed, children = [], opts = {}) {
  const {
    title,
    cls = '',
    direction = 'column',
    wrap = null,
    justify = null,
    align = null,
    g = LAYOUT.gap,
    width = null,
    boxed = false,
    boxWidth = LAYOUT.max,
    padding = null,
    margin = null,
    radius = null,
    bg = null,
    border = null,
    shadow = null,
    minHeight = null,
    overflow = null,
    sticky = null,
    responsive = {},
    customCss = null,
    htmlTag = null,
    elementId = null,
  } = opts;

  const settings = {
    content_width: boxed ? 'boxed' : 'full',
    flex_direction: direction,
  };
  if (boxed) settings.width = { unit: 'px', size: boxWidth, sizes: [] };
  if (wrap) settings.flex_wrap = wrap;
  if (justify) settings.flex_justify_content = justify;
  if (align) settings.flex_align_items = align;
  if (g !== null && g !== undefined) settings.flex_gap = gap(g);
  if (width) settings.width = width;
  if (padding) settings.padding = padding;
  if (margin) settings.margin = margin;
  if (radius) settings.border_radius = radius;
  if (bg) settings.background_background = 'classic';
  if (bg) settings.background_color = bg;
  if (border) {
    settings.border_border = 'solid';
    settings.border_width = border.width || edge(1);
    settings.border_color = border.color || C.line;
  }
  if (shadow) {
    settings.box_shadow_box_shadow_type = 'yes';
    settings.box_shadow_box_shadow = shadow;
  }
  if (minHeight) settings.min_height = { unit: 'px', size: minHeight, sizes: [] };
  if (overflow) settings.overflow = overflow;
  if (sticky) settings.position = sticky;
  if (htmlTag) settings.html_tag = htmlTag;
  if (elementId) settings._element_id = elementId;
  if (customCss) settings.custom_css = customCss;

  Object.assign(settings, resp({}, responsive));
  settings.css_classes = cls;

  return {
    id: doc.id(seed),
    elType: 'container',
    isInner: false,
    settings: base(doc, seed, settings, title, cls),
    elements: children.filter(Boolean),
  };
}

/** Grid row: children get percentage widths per breakpoint. */
export function grid(doc, seed, children, opts = {}) {
  const { cols = 3, tablet = null, mobile = 1, g = LAYOUT.gap, title, cls = 'az-grid', ...rest } = opts;
  const tCols = tablet ?? (cols >= 3 ? 2 : cols);
  const items = children
    .filter(Boolean)
    .map((child, i) => withWidth(child, cell(cols, { tablet: tCols, mobile: 100 / mobile })));
  return container(doc, seed, items, {
    title,
    cls: `${cls} az-grid--${String(cols)}`,
    direction: 'row',
    wrap: 'wrap',
    g,
    ...rest,
  });
}

function withWidth(el, width) {
  if (!el || el.elType !== 'container' || !width) return el;
  const { base, tablet, mobile } = width;
  el.settings = { ...el.settings, width: base };
  if (tablet) el.settings.width_tablet = tablet;
  if (mobile) el.settings.width_mobile = mobile;
  return el;
}

/* --------------------------------------------------------- text elements */
export function heading(doc, seed, text, opts = {}) {
  const {
    level = 'h2',
    cls = '',
    title,
    color = C.navy,
    align = 'right',
    display = level === 'h1' || level === 'h2' || level === 'h3',
    size = null,
    weight = null,
    lineHeight = null,
    margin = null,
    responsive = {},
  } = opts;
  const t = { h1: TYPE.h1, h2: TYPE.h2, h3: TYPE.h3 }[level] || TYPE.ui;
  const settings = {
    title: text,
    header_size: level,
    align,
    title_color: color,
    typography_typography: 'custom',
    typography_font_family: display ? FONT.display : FONT.ui,
    typography_font_weight: weight || (display ? '400' : '700'),
  };
  if (size) settings.typography_font_size = { unit: 'px', size, sizes: [] };
  else settings.typography_font_size = { unit: 'px', size: display ? t.max : t.max, sizes: [] };
  settings.typography_line_height = { unit: 'em', size: lineHeight || t.lh, sizes: [] };
  if (margin) settings.margin = margin;
  Object.assign(settings, resp({}, responsive));
  return widget(doc, seed, 'heading', settings, { title: title || `${level.toUpperCase()} — ${strip(text)}`, cls });
}

export function paragraph(doc, seed, html, opts = {}) {
  const {
    cls = '',
    title,
    color = C.text,
    align = 'right',
    size = 16,
    lineHeight = 1.95,
    weight = '400',
    font = FONT.ui,
    margin = null,
    responsive = {},
  } = opts;
  const settings = {
    editor: `<p dir="rtl">${html}</p>`,
    align,
    text_color: color,
    typography_typography: 'custom',
    typography_font_family: font,
    typography_font_size: { unit: 'px', size, sizes: [] },
    typography_font_weight: weight,
    typography_line_height: { unit: 'em', size: lineHeight, sizes: [] },
  };
  if (margin) settings.margin = margin;
  Object.assign(settings, resp({}, responsive));
  return widget(doc, seed, 'text-editor', settings, { title: title || `متن — ${strip(html)}`, cls });
}

/** Raw HTML block (used only for trusted, static markup shells). */
export function htmlBlock(doc, seed, html, opts = {}) {
  return widget(doc, seed, 'html', { html, ...resp({}, opts.responsive || {}) }, { title: opts.title || 'بلوک HTML', cls: opts.cls || '' });
}

export function kicker(doc, seed, label, opts = {}) {
  return widget(
    doc,
    seed,
    'heading',
    {
      title: label,
      header_size: 'span',
      align: opts.align || 'right',
      title_color: opts.color || C.navy,
      background_color: opts.bg || C.cream,
      border_border: 'solid',
      border_width: edge(1),
      border_color: opts.borderColor || C.line,
      border_radius: edge(10),
      padding: { unit: 'px', top: '5', right: '12', bottom: '5', left: '12', isLinked: false },
      typography_typography: 'custom',
      typography_font_family: FONT.ui,
      typography_font_size: { unit: 'px', size: 12.5, sizes: [] },
      typography_font_weight: '700',
    },
    { title: opts.title || `برچسب — ${label}`, cls: `az-kicker ${opts.cls || ''}`.trim() }
  );
}

/* ------------------------------------------------------------- controls */
export function button(doc, seed, label, url = '#', opts = {}) {
  const { variant = 'primary', cls = '', title, block = false, size = 'md', icon = null, responsive = {} } = opts;
  const palette = {
    primary: { text: C.white, bg: C.navy, border: C.navy },
    accent: { text: C.white, bg: C.red, border: C.red },
    outline: { text: C.navy, bg: 'transparent', border: C.lineStrong },
    ghost: { text: C.navy, bg: C.surface, border: C.line },
  }[variant];
  const settings = {
    text: label,
    link: { url, is_external: '', nofollow: '', custom_attributes: '' },
    size,
    align: block ? 'center' : 'right',
    button_type: 'info',
    text_color: palette.text,
    background_color: palette.bg,
    border_border: 'solid',
    border_width: edge(1),
    border_color: palette.border,
    border_radius: edge(LAYOUT.btnRadius),
    typography_typography: 'custom',
    typography_font_family: FONT.ui,
    typography_font_size: { unit: 'px', size: 15, sizes: [] },
    typography_font_weight: '700',
    button_text_padding: { unit: 'px', top: '13', right: '22', bottom: '13', left: '22', isLinked: false },
    ...(icon ? { selected_icon: icon } : {}),
    ...(block ? { button_full_width: 'yes' } : {}),
  };
  Object.assign(settings, resp({}, { mobile: { align: 'center' }, ...responsive }));
  return widget(doc, seed, 'button', settings, {
    title: title || `دکمه — ${label}`,
    cls: `az-btn az-btn--${variant}${block ? ' az-btn--block' : ''} ${cls}`.trim(),
  });
}

export function linkText(doc, seed, label, url = '#', opts = {}) {
  return paragraph(doc, seed, `<a href="${url}">${label}</a>`, { ...opts, cls: `az-link ${opts.cls || ''}`.trim(), size: opts.size || 15 });
}

/* --------------------------------------------------------------- pieces */
export function spacer(doc, seed, height = 24, responsive = {}) {
  const settings = { space: { unit: 'px', size: height, sizes: [] } };
  Object.assign(settings, resp({}, responsive));
  return widget(doc, seed, 'spacer', settings, { title: `فاصله ${height}`, cls: 'az-spacer' });
}

export function divider(doc, seed, opts = {}) {
  const { style = 'solid', weight = 1, color = C.lineStrong, width = 100, cls = '', title = 'جداکننده' } = opts;
  return widget(
    doc,
    seed,
    'divider',
    { style, weight: { unit: 'px', size: weight, sizes: [] }, color, width: { unit: '%', size: width, sizes: [] }, align: 'right', gap: { unit: 'px', size: 14, sizes: [] } },
    { title, cls: `az-divider ${cls}`.trim() }
  );
}

/** The signature carpet strip (one bold move, used sparingly per page). */
export function patternStrip(doc, seed, opts = {}) {
  const { cls = 'az-rule az-rule--short', title = 'نوار بافت', bg = C.cream, height = 10 } = opts;
  return container(doc, seed, [], {
    title,
    cls,
    minHeight: height,
    bg,
    radius: edge(999),
    responsive: { mobile: { min_height: { unit: 'px', size: height, sizes: [] } } },
  });
}

export function iconList(doc, seed, items, opts = {}) {
  const {
    icon = { value: 'fas fa-check', library: 'fa-solid' },
    color = C.teal,
    textColor = C.text,
    cls = 'az-list',
    size = 15,
    gapSize = 12,
    title = 'فهرست',
  } = opts;
  const settings = {
    icon_list: items.map((item, i) => {
      const text = typeof item === 'string' ? item : item.text;
      const ic = (typeof item === 'object' && item.icon) || icon;
      return { _id: doc.id(`${seed}-li-${i}`), text, selected_icon: ic };
    }),
    icon_color: color,
    text_color: textColor,
    icon_size: { unit: 'px', size, sizes: [] },
    space_between: { unit: 'px', size: gapSize, sizes: [] },
    typography_typography: 'custom',
    typography_font_family: FONT.ui,
    typography_font_size: { unit: 'px', size: 15, sizes: [] },
    typography_line_height: { unit: 'em', size: 1.9, sizes: [] },
  };
  return widget(doc, seed, 'icon-list', settings, { title, cls });
}

export function accordion(doc, seed, items, opts = {}) {
  const { title = 'پرسش‌های پرتکرار', cls = 'az-accordion', tag = 'h3' } = opts;
  const settings = {
    tabs: items.map((item, i) => ({
      _id: doc.id(`${seed}-tab-${i}`),
      tab_title: item.q,
      tab_content: `<div dir="rtl">${item.a}</div>`,
    })),
    title_html_tag: tag,
    icon_color: C.navy,
    icon_active_color: C.red,
    tab_title_color: C.navy,
    tab_title_active_color: C.red,
    tab_content_color: C.text,
    border_width: edge(1),
    border_color: C.line,
    title_typography_typography: 'custom',
    title_typography_font_family: FONT.ui,
    title_typography_font_size: { unit: 'px', size: 16, sizes: [] },
    title_typography_font_weight: '700',
    content_typography_typography: 'custom',
    content_typography_font_family: FONT.ui,
    content_typography_font_size: { unit: 'px', size: 15, sizes: [] },
    content_typography_line_height: { unit: 'em', size: 1.95, sizes: [] },
  };
  return widget(doc, seed, 'accordion', settings, { title, cls });
}

export function tabs(doc, seed, items, opts = {}) {
  const { title = 'تب‌ها', cls = 'az-tabs' } = opts;
  return widget(
    doc,
    seed,
    'tabs',
    {
      tabs: items.map((item, i) => ({
        _id: doc.id(`${seed}-t-${i}`),
        tab_title: item.title,
        tab_content: `<div dir="rtl">${item.content}</div>`,
      })),
      title_typography_typography: 'custom',
      title_typography_font_family: FONT.ui,
      title_typography_font_weight: '700',
      content_typography_typography: 'custom',
      content_typography_font_family: FONT.ui,
      content_typography_font_size: { unit: 'px', size: 15, sizes: [] },
    },
    { title, cls }
  );
}

export function imageWidget(doc, seed, opts = {}) {
  const {
    alt = 'تصویر',
    url = '',
    aspect = null,
    radius = edge(16),
    objectFit = 'cover',
    height = null,
    cls = 'az-image',
    title = 'تصویر',
    caption = '',
  } = opts;
  const settings = {
    image: { url, id: '', size: '', alt, source: 'library' },
    image_border_radius: radius,
    caption,
  };
  if (aspect) settings.aspect_ratio = aspect;
  else if (height) settings.height = { unit: 'px', size: height, sizes: [] };
  if (height) settings.object_fit = objectFit;
  return widget(doc, seed, 'image', settings, { title, cls });
}

/** Framed media slot: works before real assets are uploaded (no broken image). */
export function mediaFrame(doc, seed, opts = {}) {
  const { label = 'جای تصویر', note = '', ratio = '4 / 3', cls = 'az-card__media', title = 'قاب تصویر' } = opts;
  return container(doc, seed, [], {
    title,
    cls,
    minHeight: 10,
    bg: null,
    responsive: { mobile: { min_height: { unit: 'px', size: 10, sizes: [] } } },
    customCss: `selector{ aspect-ratio:${ratio}; display:grid; place-items:center; text-align:center; background:linear-gradient(135deg, ${C.cream}, #DCCBA6); color:${C.navy}; font-family:${FONT.ui}, sans-serif; border-radius:16px; overflow:hidden; }\nselector::after{ content:"${label}\\A ${note}"; white-space:pre; font-size:13px; line-height:2; opacity:.75; padding:12px; }`,
  });
}

export function videoSlot(doc, seed, opts = {}) {
  const { title = 'ویدیو', url = '', overlayNote = 'ویدیوی معرفی', cls = 'az-video' } = opts;
  const settings = {
    video_type: 'youtube',
    youtube_url: url,
    aspect_ratio: '169',
    autoplay: '',
    mute: '',
    loop: '',
    controls: 'yes',
    lazy_load: 'yes',
    show_image_overlay: url ? '' : 'yes',
    image_overlay: { url: '', id: '', size: '', alt: overlayNote, source: 'library' },
  };
  return widget(doc, seed, 'video', settings, { title, cls });
}

export function alert(doc, seed, opts = {}) {
  const { type = 'info', headingText = '', body = '', cls = 'az-alert', title = 'نکته' } = opts;
  return widget(doc, seed, 'alert', { alert_type: type, alert_title: headingText, alert_description: body, show_dismiss_button: '' }, { title, cls });
}

export function iconBox(doc, seed, opts = {}) {
  const {
    icon = { value: 'fas fa-star', library: 'fa-solid' },
    title: headingText = '',
    description = '',
    position = 'top',
    titleTag = 'h4',
    cls = 'az-iconbox',
    navTitle = 'آیتم',
  } = opts;
  return widget(
    doc,
    seed,
    'icon-box',
    {
      selected_icon: icon,
      title_text: headingText,
      description_text: `<p dir="rtl">${description}</p>`,
      position,
      title_html_tag: titleTag,
      icon_color: C.red,
      title_color: C.navy,
      description_color: C.text,
      icon_size: { unit: 'px', size: 26, sizes: [] },
      title_typography_typography: 'custom',
      title_typography_font_family: FONT.ui,
      title_typography_font_size: { unit: 'px', size: 18, sizes: [] },
      title_typography_font_weight: '700',
      description_typography_typography: 'custom',
      description_typography_font_family: FONT.ui,
      description_typography_font_size: { unit: 'px', size: 14.5, sizes: [] },
      description_typography_line_height: { unit: 'em', size: 1.9, sizes: [] },
    },
    { title: navTitle, cls }
  );
}

export function testimonial(doc, seed, opts = {}) {
  const { quote = '', name = '', role = '', cls = 'az-card az-card--flat', title = 'تأییدیه' } = opts;
  return widget(
    doc,
    seed,
    'testimonial',
    {
      testimonial_content: `<p dir="rtl">${quote}</p>`,
      testimonial_name: name,
      testimonial_job: role,
      testimonial_alignment: 'right',
      content_typography_typography: 'custom',
      content_typography_font_family: FONT.ui,
      content_typography_font_size: { unit: 'px', size: 15.5, sizes: [] },
      content_typography_line_height: { unit: 'em', size: 1.95, sizes: [] },
      content_color: C.text,
      name_typography_typography: 'custom',
      name_typography_font_family: FONT.ui,
      name_typography_font_weight: '700',
      name_color: C.navy,
      job_color: C.muted,
    },
    { title, cls }
  );
}

export function progressBar(doc, seed, opts = {}) {
  const { percent = 0, label = 'پیشرفت دوره', title = 'نوار پیشرفت' } = opts;
  return widget(
    doc,
    seed,
    'progress',
    {
      title: label,
      percent: String(percent),
      display_percentage: 'yes',
      progress_type: 'info',
      inner_text_color: C.navy,
      bar_color: C.teal,
      bg_color: C.cream,
      typography_typography: 'custom',
      typography_font_family: FONT.ui,
      typography_font_size: { unit: 'px', size: 13, sizes: [] },
      height: { unit: 'px', size: 9, sizes: [] },
      border_radius: edge(999),
    },
    { title, cls: 'az-progress-widget' }
  );
}

export function shortcodeWidget(doc, seed, code, opts = {}) {
  const { title = 'اتصال افزونه', cls = 'az-mount' } = opts;
  return widget(doc, seed, 'shortcode', { shortcode: code }, { title: `${title} — ${code.slice(0, 34)}`, cls });
}

/** Elementor Pro form widget wrapped in a styled card. */
export function contactForm(doc, seed, opts = {}) {
  const { fields = [], button = 'ارسال', title = 'فرم', successMessage = 'پیام شما ثبت شد. در ساعات کاری پاسخ می‌دهیم.', cls = 'az-form' } = opts;
  const settings = {
    form_name: 'فرم تماس کارگاه',
    form_fields: fields.map((f, i) => ({
      _id: doc.id(`${seed}-f-${i}`),
      custom_id: f.id,
      field_type: f.type || 'text',
      field_label: f.label,
      placeholder: f.placeholder || '',
      required: f.required || '',
      width: f.width || '100',
      width_tablet: '100',
      width_mobile: '100',
      ...(f.options ? { field_options: f.options.join('\n') } : {}),
      ...(f.rows ? { rows: String(f.rows) } : {}),
    })),
    submit_actions: ['email'],
    email_to: 'REPLACE: info@asadzadehacademy.ir',
    email_subject: 'پیام جدید از سایت',
    email_content: '[all-fields]',
    button_text: button,
    button_size: 'md',
    button_align: 'stretch',
    success_message: successMessage,
    error_message: 'ارسال انجام نشد. اتصال را بررسی و دوباره تلاش کنید.',
    required_field_message: 'این فیلد الزامی است.',
    label_color: C.navy,
    label_typography_typography: 'custom',
    label_typography_font_family: FONT.ui,
    label_typography_font_size: { unit: 'px', size: 14.5, sizes: [] },
    label_typography_font_weight: '700',
    field_text_color: C.text,
    field_background_color: C.surface,
    field_border_color: '#193B5C33',
    field_border_radius: edge(LAYOUT.controlRadius),
    field_typography_typography: 'custom',
    field_typography_font_family: FONT.ui,
    field_typography_font_size: { unit: 'px', size: 16, sizes: [] },
    button_text_color: C.white,
    button_background_color: C.red,
    button_background_hover_color: C.redHover,
    button_border_radius: edge(LAYOUT.btnRadius),
    button_typography_typography: 'custom',
    button_typography_font_family: FONT.ui,
    button_typography_font_weight: '700',
    button_padding: { unit: 'px', top: '14', right: '22', bottom: '14', left: '22', isLinked: false },
  };
  return container(
    doc,
    seed,
    [widget(doc, `${seed}-widget`, 'form', settings, { title, cls })],
    {
      title: `کارت ${title}`,
      cls: 'az-form-card',
      g: 0,
      bg: C.surface,
      radius: edge(22),
      border: { color: C.line },
      padding: { unit: 'px', top: '22', right: '22', bottom: '22', left: '22', isLinked: false },
      responsive: { mobile: { padding: { unit: 'px', top: '16', right: '16', bottom: '16', left: '16', isLinked: false } } },
    }
  );
}

export function searchForm(doc, seed, opts = {}) {
  const { placeholder = 'دوره، مقاله، کلاس یا محصول', title = 'جست‌وجو' } = opts;
  return widget(
    doc,
    seed,
    'search-form',
    { placeholder, button_type: 'icon', button_size: 'lg' },
    { title, cls: 'az-search-widget' }
  );
}

/* ------------------------------------------------------------ utilities */
export function strip(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Section wrapper: max-width boxed content with consistent rhythm. */
export function section(doc, seed, children, opts = {}) {
  const { title, cls = 'az-section', bg = null, variant = '', innerCls = 'az-wrap', boxed = true, radius = null, padding = null, ...rest } = opts;
  const classes = [cls, variant].filter(Boolean).join(' ');
  return container(
    doc,
    `${seed}-section`,
    [
      container(doc, `${seed}-inner`, children, {
        title: title ? `${title} — محتوا` : 'محتوا',
        cls: innerCls,
        boxed,
        g: 22,
        ...rest,
      }),
    ],
    {
      title: title || 'بخش',
      cls: classes,
      bg,
      radius,
      padding: padding || { unit: 'px', top: '64', right: '0', bottom: '64', left: '0', isLinked: false },
      responsive: {
        tablet: { padding: { unit: 'px', top: '48', right: '0', bottom: '48', left: '0', isLinked: false } },
        mobile: { padding: { unit: 'px', top: '34', right: '0', bottom: '34', left: '0', isLinked: false } },
      },
    }
  );
}

/** Page-level root: full width page shell that carries the scoped design-system CSS. */
export function pageRoot(doc, seed, children, opts = {}) {
  const { title = 'ریشه صفحه', customCss, cls = 'az-page', bg = null } = opts;
  return container(doc, seed, children, {
    title,
    cls,
    bg,
    g: 0,
    overflow: 'hidden',
    customCss,
  });
}
