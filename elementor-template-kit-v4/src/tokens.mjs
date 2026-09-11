/**
 * Design tokens — Asadzadeh Academy Elementor Kit V5
 * Source of truth: docs/DESIGN-SYSTEM.md (spec §7, §8, §9).
 * Fonts are NEVER bundled; they must be registered in Elementor Custom Fonts.
 */

export const FONT = {
  display: 'Neirizi',
  ui: 'Peyda',
  fallback: 'IRANSans, Vazirmatn, Tahoma, sans-serif',
};

export const C = {
  bg: '#F3E9D6',
  surface: '#FFF8EC',
  surfaceAlt: '#FBEFDD',
  navy: '#193B5C',
  navyHover: '#244D72',
  red: '#9D382C',
  redHover: '#B24739',
  teal: '#2F8C87',
  cream: '#E8D8B8',
  dark: '#152F3D',
  text: '#45423D',
  muted: '#6D6A63',
  white: '#FFFFFF',
  line: '#193B5C1F',
  lineStrong: '#193B5C33',
};

export const STATUS = {
  success: { fg: '#1F6B4A', bg: '#E4F1E7', border: '#BBDCC6' },
  warn: { fg: '#8A5A12', bg: '#FBF0DC', border: '#E7D2A8' },
  danger: { fg: '#8E2F25', bg: '#F7E4E1', border: '#E2B9B2' },
  info: { fg: '#1D5A6B', bg: '#E1F0F1', border: '#B2D6D8' },
  neutral: { fg: C.muted, bg: C.surfaceAlt, border: C.line },
};

/** Breakpoints used by Elementor (Elementor uses max-width for tablet/mobile). */
export const BP = { tablet: 1024, tabletSm: 860, mobile: 767, mobileSm: 420, mobileXs: 360 };

export const LAYOUT = {
  max: 1240,
  gutterDesktop: 32, // => calc(100% - 64px)
  gutterMobile: 12, // => calc(100% - 24px)
  gap: 24,
  cardRadius: 22,
  controlRadius: 12,
  btnRadius: 13,
};

/** Fluid editorial type scale (Persian needs generous line-height). */
export const TYPE = {
  h1: { min: 32, max: 60, lh: 1.28, font: FONT.display, weight: '400' },
  h1Hero: { min: 34, max: 64, lh: 1.22, font: FONT.display, weight: '400' },
  h2: { min: 26, max: 44, lh: 1.34, font: FONT.display, weight: '400' },
  h3: { min: 21, max: 28, lh: 1.45, font: FONT.display, weight: '400' },
  ui: { min: 17, max: 21, lh: 1.6, font: FONT.ui, weight: '700' },
  body: { min: 15, max: 17, lh: 1.95, font: FONT.ui, weight: '400' },
  lead: { min: 16, max: 19, lh: 1.95, font: FONT.ui, weight: '400' },
  small: { min: 14, max: 15, lh: 1.8, font: FONT.ui, weight: '400' },
  kicker: { min: 12, max: 13, lh: 1.6, font: FONT.ui, weight: '700' },
};

/** Clamp helper: fluid between mobileXs and desktop without JS. */
export const clamp = (min, max) =>
  `clamp(${min}px, ${(min / 360).toFixed(3)}rem + ${(((max - min) / (1440 - 360)) * 100).toFixed(3)}vw, ${max}px)`;

export const typeRule = (t) => ({
  fontFamily: `${t.font}, ${FONT.fallback}`,
  fontSize: clamp(t.min, t.max),
  lineHeight: String(t.lh),
  fontWeight: t.weight,
});

/** Column width preset for flex containers (percentage based, RTL safe). */
export function colWidth(cols, opts = {}) {
  const { tablet, mobile } = { tablet: null, mobile: 100, ...opts };
  const pct = (n) => `${(100 / n).toFixed(4)}%`;
  const out = { unit: '%', size: pct(cols) };
  if (tablet) out.size = pct(cols); // desktop
  if (tablet) out.tablet = pct(tablet);
  if (mobile) out.mobile = pct(mobile);
  return out;
}

export const SIZES = {
  px: (v) => ({ unit: 'px', size: v, sizes: [] }),
  em: (v) => ({ unit: 'em', size: v, sizes: [] }),
  pct: (v) => ({ unit: '%', size: v, sizes: [] }),
};

export function edge(top, right = top, bottom = top, left = right) {
  return { unit: 'px', top: String(top), right: String(right), bottom: String(bottom), left: String(left), isLinked: false };
}

export function gap(size) {
  return { column: String(size), row: String(size), unit: 'px', size, isLinked: true };
}
