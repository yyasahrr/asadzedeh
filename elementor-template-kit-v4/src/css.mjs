/**
 * Design-system CSS.
 *
 * Rules are written against the Elementor `selector` token, so when this string is
 * placed into a container's `custom_css` control, Elementor replaces `selector`
 * with that container's unique class => every rule is scoped to the template root
 * (spec §35: never write broad `h1 {}` rules, never break other pages).
 *
 * The same stylesheet is shipped as docs/design-system.css for site-wide paste.
 */
import { C, FONT, STATUS, clamp } from './tokens.mjs';

const V = {
  '--az-bg': C.bg,
  '--az-surface': C.surface,
  '--az-surface-alt': C.surfaceAlt,
  '--az-navy': C.navy,
  '--az-navy-hover': C.navyHover,
  '--az-red': C.red,
  '--az-red-hover': C.redHover,
  '--az-teal': C.teal,
  '--az-cream': C.cream,
  '--az-dark': C.dark,
  '--az-text': C.text,
  '--az-muted': C.muted,
  '--az-line': '#193B5C1F',
  '--az-line-strong': '#193B5C33',
  '--az-radius-card': '22px',
  '--az-radius-control': '12px',
  '--az-radius-btn': '13px',
  '--az-shadow-soft': '0 1px 2px rgba(21,47,61,.05), 0 10px 30px -18px rgba(21,47,61,.22)',
  '--az-shadow-rail': '0 2px 6px rgba(21,47,61,.06), 0 24px 50px -32px rgba(21,47,61,.30)',
  '--az-gutter': '32px',
};

const vars = Object.entries(V)
  .map(([k, v]) => `  ${k}: ${v};`)
  .join('\n');

/**
 * Media query blocks are emitted as plain CSS; every selector inside still starts
 * with the `selector` token so scoping is preserved.
 */
export const DESIGN_SYSTEM_CSS = `selector{
${vars}
  --az-font-display: ${FONT.display}, ${FONT.fallback};
  --az-font-ui: ${FONT.ui}, ${FONT.fallback};
  direction: rtl;
  color: var(--az-text);
  background: var(--az-bg);
  font-family: var(--az-font-ui);
  line-height: 1.95;
  -webkit-text-size-adjust: 100%;
}
selector *, selector *::before, selector *::after{ box-sizing: border-box; }
selector :where(h1,h2,h3,h4,h5,h6){ font-family: var(--az-font-display); color: var(--az-navy); margin: 0 0 .5em; font-weight: 400; }
selector h1{ font-size: ${clamp(32, 60)}; line-height: 1.28; }
selector h2{ font-size: ${clamp(26, 44)}; line-height: 1.34; }
selector h3{ font-size: ${clamp(21, 28)}; line-height: 1.45; }
selector h4{ font-family: var(--az-font-ui); font-size: ${clamp(18, 22)}; font-weight: 700; color: var(--az-navy); }
selector p{ margin: 0 0 1em; font-size: ${clamp(15, 17)}; line-height: 1.95; }
selector a{ color: var(--az-navy); text-decoration: none; }
selector :where(a,button,input,select,textarea,summary,[tabindex]):focus-visible{
  outline: 3px solid var(--az-teal);
  outline-offset: 3px;
  border-radius: 6px;
}
selector img{ max-width: 100%; height: auto; display: block; border-radius: 16px; }

/* ---------- layout primitives ---------- */
selector .az-wrap{ width: 100%; max-width: 1240px; margin-inline: auto; padding-inline: var(--az-gutter); }
selector .az-section{ padding-block: clamp(38px, 6vw, 78px); }
selector .az-section--tight{ padding-block: clamp(26px, 4vw, 46px); }
selector .az-section--alt{ background: var(--az-surface); }
selector .az-grid{ display: grid; gap: 22px; }
selector .az-grid--2{ grid-template-columns: repeat(2, minmax(0,1fr)); }
selector .az-grid--3{ grid-template-columns: repeat(3, minmax(0,1fr)); }
selector .az-grid--4{ grid-template-columns: repeat(4, minmax(0,1fr)); }
selector .az-split{ display: grid; grid-template-columns: minmax(0,1.55fr) minmax(0,1fr); gap: clamp(20px, 3vw, 40px); align-items: start; }
selector .az-stack{ display: flex; flex-direction: column; gap: 14px; }
selector .az-row{ display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
selector .az-row--end{ justify-content: flex-end; }
selector .az-visually-hidden{ position:absolute!important; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }

/* ---------- carpet / kilim signature (spec §42: one bold move per page) ---------- */
selector .az-rule{
  height: 10px; border-radius: 999px;
  background-image:
    repeating-linear-gradient(90deg, var(--az-navy) 0 14px, transparent 14px 22px),
    repeating-linear-gradient(90deg, var(--az-red) 0 4px, transparent 4px 22px);
  background-size: 22px 3px, 22px 3px;
  background-position: 0 0, 0 7px;
  background-repeat: repeat-x;
  opacity: .5;
}
selector .az-rule--short{ width: 92px; }
selector .az-kicker{
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--az-font-ui); font-size: 12.5px; font-weight: 700; letter-spacing: .02em;
  color: var(--az-navy); background: var(--az-cream);
  border: 1px solid var(--az-line); border-radius: 10px; padding: 5px 12px;
}
selector .az-kicker--red{ background: #F6E3DE; color: var(--az-red); border-color: #E7C4BC; }
selector .az-kicker--teal{ background: #E1F0F1; color: #1D5A6B; border-color: #B2D6D8; }
selector .az-section-head{ display: flex; flex-direction: column; gap: 10px; margin-bottom: 26px; }
selector .az-section-head .az-lead{ color: var(--az-muted); max-width: 62ch; margin: 0; }

/* ---------- cards ---------- */
selector .az-card{
  background: var(--az-surface); border: 1px solid var(--az-line);
  border-radius: var(--az-radius-card); padding: 22px;
  box-shadow: var(--az-shadow-soft);
  display: flex; flex-direction: column; gap: 12px; height: 100%;
}
selector .az-card--flat{ box-shadow: none; background: transparent; border-style: dashed; }
selector .az-card--navy{ background: var(--az-navy); border-color: var(--az-navy); color: #EFE6D6; }
selector .az-card--navy :where(h1,h2,h3,h4), selector .az-card--navy a{ color: #FFF3E1; }
selector .az-card--navy p{ color: rgba(255,243,225,.82); }
selector .az-card--cream{ background: var(--az-cream); border-color: #D9C69F; }
selector .az-card__meta{ display:flex; flex-wrap:wrap; gap:8px 14px; font-size:13.5px; color:var(--az-muted); }
selector .az-card__title{ font-family: var(--az-font-display); font-size: clamp(19px,2vw,24px); color: var(--az-navy); margin:0; }
selector .az-card__media{ aspect-ratio: 4/3; overflow:hidden; border-radius:16px; background: linear-gradient(135deg, var(--az-cream), #E3D2B0); }
selector .az-card--navy .az-card__media{ background: linear-gradient(135deg, #244D72, #152F3D); }
selector .az-card__media img{ width:100%; height:100%; object-fit:cover; border-radius:0; }

/* ---------- badge / status ---------- */
selector .az-badge{
  display:inline-flex; align-items:center; gap:6px;
  font-family: var(--az-font-ui); font-size:12.5px; font-weight:700;
  padding:4px 10px; border-radius:999px; border:1px solid var(--az-line); background:var(--az-surface-alt); color:var(--az-muted);
  line-height:1.8;
}
selector .az-badge--success{ color:${STATUS.success.fg}; background:${STATUS.success.bg}; border-color:${STATUS.success.border}; }
selector .az-badge--warn{ color:${STATUS.warn.fg}; background:${STATUS.warn.bg}; border-color:${STATUS.warn.border}; }
selector .az-badge--danger{ color:${STATUS.danger.fg}; background:${STATUS.danger.bg}; border-color:${STATUS.danger.border}; }
selector .az-badge--info{ color:${STATUS.info.fg}; background:${STATUS.info.bg}; border-color:${STATUS.info.border}; }

/* ---------- buttons ---------- */
selector .az-btn{
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  min-height:48px; padding:12px 22px; border-radius: var(--az-radius-btn);
  font-family: var(--az-font-ui); font-size:15px; font-weight:700; line-height:1.6;
  border:1px solid transparent; cursor:pointer; transition: background-color .18s ease, color .18s ease, border-color .18s ease, transform .18s ease;
}
selector .az-btn--primary{ background: var(--az-navy); color:#FFF8EC; }
selector .az-btn--accent{ background: var(--az-red); color:#FFF8EC; }
selector .az-btn--outline{ background: transparent; color: var(--az-navy); border-color: var(--az-line-strong); }
selector .az-btn--ghost{ background: var(--az-surface); color: var(--az-navy); border-color: var(--az-line); }
selector .az-btn--block{ width:100%; }
selector .az-btn[disabled], selector .az-btn--disabled{ opacity:.55; pointer-events:none; }

/* ---------- forms ---------- */
selector .az-form :where(input,select,textarea){
  width:100%; font-family: var(--az-font-ui); font-size:16px; line-height:1.7;
  color: var(--az-text); background: var(--az-surface);
  border:1px solid var(--az-line-strong); border-radius: var(--az-radius-control);
  padding:13px 14px; min-height:50px;
}
selector .az-form textarea{ min-height:130px; }
selector .az-form label{ display:block; font-family: var(--az-font-ui); font-size:14.5px; font-weight:700; color:var(--az-navy); margin-bottom:7px; }
selector .az-form :where(input,select,textarea):focus{ border-color: var(--az-teal); }
selector .az-form .az-field{ margin-bottom:16px; }
selector .az-form--inline{ display:flex; gap:12px; flex-wrap:wrap; }
selector .az-form--inline .az-field{ flex:1 1 220px; margin-bottom:0; }
selector .az-form-note{ font-size:13.5px; color: var(--az-muted); }
selector .az-form-error{ color:${STATUS.danger.fg}; background:${STATUS.danger.bg}; border:1px solid ${STATUS.danger.border}; border-radius:12px; padding:10px 14px; font-size:14px; }

/* ---------- hero ---------- */
selector .az-hero{ position:relative; overflow:hidden; background: var(--az-bg); }
selector .az-hero__grid{ display:grid; grid-template-columns: minmax(0,1.15fr) minmax(0,.85fr); gap: clamp(24px,4vw,54px); align-items:center; }
selector .az-hero h1{ font-size:${clamp(34, 64)}; line-height:1.22; margin-bottom:16px; }
selector .az-hero__lead{ font-size:${clamp(16, 19)}; color:var(--az-muted); max-width:56ch; }
selector .az-hero__frame{ position:relative; border-radius:26px; overflow:hidden; aspect-ratio:4/5; background: linear-gradient(160deg,#E8D8B8,#CDB892); box-shadow: var(--az-shadow-rail); }
selector .az-hero__frame::after{
  content:""; position:absolute; inset:0;
  background-image: repeating-linear-gradient(45deg, rgba(25,59,92,.06) 0 2px, transparent 2px 12px);
  pointer-events:none;
}
selector .az-hero__frame img{ width:100%; height:100%; object-fit:cover; border-radius:0; }

/* ---------- breadcrumb ---------- */
selector .az-crumbs{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; font-size:13.5px; color:var(--az-muted); }
selector .az-crumbs a{ color:var(--az-muted); }
selector .az-crumbs .az-sep{ opacity:.6; transform: scaleX(-1); display:inline-block; }
selector .az-crumbs [aria-current="page"]{ color:var(--az-navy); font-weight:700; }

/* ---------- progress ---------- */
selector .az-progress{ height:9px; border-radius:999px; background: var(--az-cream); overflow:hidden; }
selector .az-progress > i{ display:block; height:100%; border-radius:999px; background: var(--az-teal); width:0; }
selector .az-progress-label{ display:flex; justify-content:space-between; font-size:13px; color:var(--az-muted); }

/* ---------- sticky rail ---------- */
selector .az-rail{ position:sticky; top:96px; display:flex; flex-direction:column; gap:14px; }
selector .az-rail .az-card{ box-shadow: var(--az-shadow-rail); }

/* ---------- tables (Woo + LearnDash) ---------- */
selector .az-table-wrap{ overflow-x:auto; -webkit-overflow-scrolling:touch; border:1px solid var(--az-line); border-radius:16px; background:var(--az-surface); }
selector .az-table-wrap table{ width:100%; border-collapse:collapse; min-width:560px; font-family:var(--az-font-ui); font-size:15px; }
selector .az-table-wrap th, selector .az-table-wrap td{ padding:14px 16px; border-bottom:1px solid var(--az-line); text-align:right; }
selector .az-table-wrap th{ font-weight:700; color:var(--az-navy); background:var(--az-surface-alt); }
selector .az-table-wrap tr:last-child td{ border-bottom:0; }

/* ---------- empty / error / success states ---------- */
selector .az-state{ text-align:center; display:flex; flex-direction:column; align-items:center; gap:14px; padding:clamp(34px,6vw,64px) 20px; background:var(--az-surface); border:1px dashed var(--az-line-strong); border-radius:var(--az-radius-card); }
selector .az-state__icon{ width:64px; height:64px; border-radius:50%; display:grid; place-items:center; background:var(--az-cream); color:var(--az-navy); font-size:26px; }
selector .az-state--danger .az-state__icon{ background:${STATUS.danger.bg}; color:${STATUS.danger.fg}; }
selector .az-state--success .az-state__icon{ background:${STATUS.success.bg}; color:${STATUS.success.fg}; }
selector .az-state p{ color:var(--az-muted); max-width:48ch; margin:0; }

/* ---------- plugin mounts (LearnDash / Woo / Digits) ---------- */
selector .az-mount{ font-family:var(--az-font-ui); font-size:15px; line-height:1.95; color:var(--az-text); }
selector .az-mount :where(h1,h2,h3,h4){ font-family:var(--az-font-display); color:var(--az-navy); }
selector .az-mount :where(input,select,textarea){ font-size:16px; min-height:48px; border-radius:var(--az-radius-control); border:1px solid var(--az-line-strong); padding:11px 13px; background:var(--az-surface); width:100%; }
selector .az-mount :where(button,.button,input[type=submit]){ min-height:48px; border-radius:var(--az-radius-btn); font-family:var(--az-font-ui); font-weight:700; padding:12px 22px; }
selector .az-mount :where(ul,ol){ padding-inline-start:1.3em; }
selector .az-mount table{ width:100%; border-collapse:collapse; }
selector .az-mount table th, selector .az-mount table td{ padding:12px; border-bottom:1px solid var(--az-line); text-align:right; }

/* LearnDash curriculum */
selector .az-ld-list{ display:flex; flex-direction:column; gap:10px; }
selector .az-ld-item{ display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--az-surface); border:1px solid var(--az-line); border-radius:16px; }
selector .az-ld-item--locked{ background:var(--az-surface-alt); color:var(--az-muted); }
selector .az-ld-item--current{ border-color:var(--az-teal); box-shadow: inset 3px 0 0 var(--az-teal); }
selector .az-ld-item__n{ width:34px; height:34px; flex:0 0 34px; border-radius:10px; display:grid; place-items:center; background:var(--az-cream); color:var(--az-navy); font-weight:700; font-size:14px; }
selector .az-ld-item__grow{ flex:1; }
selector .az-ld-item__title{ font-weight:700; color:var(--az-navy); }
selector .az-ld-item__meta{ font-size:13px; color:var(--az-muted); }

/* WooCommerce */
selector .az-woo :where(.quantity input){ min-height:48px; font-size:16px; }
selector .az-woo .woocommerce-Price-amount{ font-family:var(--az-font-ui); font-weight:800; color:var(--az-navy); }
selector .az-woo :where(.button,button.button,input.button){ border-radius:var(--az-radius-btn)!important; min-height:48px; font-family:var(--az-font-ui); font-weight:700; }
selector .az-woo .woocommerce-error, selector .az-woo .woocommerce-message, selector .az-woo .woocommerce-info{
  border-radius:14px; border-inline-start:5px solid var(--az-teal); background:var(--az-surface); border-top:1px solid var(--az-line); border-right:1px solid var(--az-line); border-bottom:1px solid var(--az-line); padding:14px 16px; font-family:var(--az-font-ui);
}
selector .az-woo .woocommerce-error{ border-inline-start-color:${STATUS.danger.fg}; background:${STATUS.danger.bg}; }
selector .az-woo .woocommerce-message{ border-inline-start-color:${STATUS.success.fg}; background:${STATUS.success.bg}; }

/* Digits / OTP */
selector .az-otp :where(input){ font-size:22px; letter-spacing:.38em; text-align:center; min-height:58px; font-family:var(--az-font-ui); }
selector .az-otp .az-otp__hint{ font-size:13.5px; color:var(--az-muted); }
selector .az-otp .az-otp__resend{ font-family:var(--az-font-ui); font-size:14px; font-weight:700; color:var(--az-navy); background:none; border:0; cursor:pointer; min-height:44px; }
selector .az-otp .az-otp__resend[disabled]{ color:var(--az-muted); cursor:default; }

/* ---------- roadmap / steps ---------- */
selector .az-steps{ display:flex; flex-direction:column; gap:0; counter-reset: azstep; }
selector .az-step{ display:grid; grid-template-columns:54px minmax(0,1fr); gap:16px; padding-block:18px; border-top:1px dashed var(--az-line-strong); }
selector .az-step:first-child{ border-top:0; }
selector .az-step__n{ width:44px; height:44px; border-radius:14px; background:var(--az-navy); color:#FFF3E1; display:grid; place-items:center; font-weight:800; font-family:var(--az-font-ui); }
selector .az-step__body h4{ margin-bottom:4px; }
selector .az-step__body p{ color:var(--az-muted); margin:0; font-size:15px; }

/* ---------- gallery ---------- */
selector .az-gallery{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
selector .az-gallery > *{ aspect-ratio:1/1; overflow:hidden; border-radius:18px; background:var(--az-cream); }
selector .az-gallery > * img{ width:100%; height:100%; object-fit:cover; border-radius:0; }
selector .az-gallery--wide{ grid-template-columns:repeat(4,minmax(0,1fr)); }
selector .az-gallery--wide > *:first-child{ grid-column:span 2; grid-row:span 2; aspect-ratio:auto; }

/* ---------- certificate ---------- */
selector .az-cert{ background:var(--az-surface); border:1px solid var(--az-cream); border-radius:20px; padding:clamp(20px,3vw,38px); position:relative; overflow:hidden; }
selector .az-cert::before{ content:""; position:absolute; inset:10px; border:1px solid var(--az-cream); border-radius:14px; pointer-events:none; }

/* ---------- dashboard ---------- */
selector .az-dash{ display:grid; grid-template-columns:264px minmax(0,1fr); gap:clamp(18px,3vw,34px); align-items:start; }
selector .az-dash__nav{ position:sticky; top:96px; background:var(--az-surface); border:1px solid var(--az-line); border-radius:20px; padding:16px; display:flex; flex-direction:column; gap:6px; }
selector .az-dash__nav a{ display:flex; align-items:center; gap:10px; padding:11px 13px; border-radius:12px; color:var(--az-text); font-family:var(--az-font-ui); font-size:15px; font-weight:600; min-height:44px; }
selector .az-dash__nav a[aria-current="page"]{ background:var(--az-navy); color:#FFF3E1; }
selector .az-dash__nav .az-dash__sep{ height:1px; background:var(--az-line); margin:8px 4px; }
selector .az-tiles{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
selector .az-tile{ background:var(--az-surface); border:1px solid var(--az-line); border-radius:18px; padding:18px; }
selector .az-tile__label{ font-size:13px; color:var(--az-muted); }
selector .az-tile__value{ font-family:var(--az-font-display); font-size:30px; color:var(--az-navy); line-height:1.2; }

/* ---------- responsive (spec §10) ---------- */
@media (max-width: 1024px){
  selector .az-grid--4{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  selector .az-tiles{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  selector .az-gallery--wide{ grid-template-columns: repeat(3, minmax(0,1fr)); }
  selector{ --az-gutter: 24px; }
}
@media (max-width: 860px){
  selector .az-split{ grid-template-columns: minmax(0,1fr); }
  selector .az-hero__grid{ grid-template-columns: minmax(0,1fr); }
  selector .az-hero__frame{ aspect-ratio: 16/10; }
  selector .az-dash{ grid-template-columns: minmax(0,1fr); }
  selector .az-dash__nav{ position:static; }
  selector .az-rail{ position:static; }
  selector .az-grid--3{ grid-template-columns: repeat(2, minmax(0,1fr)); }
}
@media (max-width: 767px){
  selector{ --az-gutter: 12px; }
  selector .az-grid--2, selector .az-grid--3, selector .az-grid--4{ grid-template-columns: minmax(0,1fr); }
  selector .az-tiles{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  selector .az-gallery, selector .az-gallery--wide{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  selector .az-gallery--wide > *:first-child{ grid-column:auto; grid-row:auto; aspect-ratio:1/1; }
  selector .az-btn{ width:100%; }
  selector .az-row > .az-btn{ width:100%; }
  selector .az-form--inline{ flex-direction: column; }
  selector .az-step{ grid-template-columns:40px minmax(0,1fr); gap:12px; }
  selector .az-step__n{ width:34px; height:34px; border-radius:11px; font-size:14px; }
  selector .az-section{ padding-block: 34px; }
  selector .az-card{ padding:18px; }
  selector .az-dash__nav{ flex-direction: column; }
}
@media (max-width: 420px){
  selector .az-tiles{ grid-template-columns: minmax(0,1fr); }
  selector .az-hero h1{ font-size: 32px; }
  selector .az-card{ padding:16px; }
}
@media (max-width: 360px){
  selector{ --az-gutter: 10px; }
  selector .az-gallery{ grid-template-columns: minmax(0,1fr); }
}

/* ---------- hover only where a fine pointer exists (spec §10) ---------- */
@media (hover:hover) and (pointer:fine){
  selector .az-card:hover{ border-color: var(--az-line-strong); transform: translateY(-2px); }
  selector .az-btn:hover{ transform: translateY(-1px); }
  selector .az-btn--primary:hover{ background: var(--az-navy-hover); }
  selector .az-btn--accent:hover{ background: var(--az-red-hover); }
  selector .az-btn--outline:hover{ background: var(--az-surface); border-color: var(--az-navy); }
  selector .az-dash__nav a:hover{ background: var(--az-surface-alt); }
}

/* ---------- motion preferences (spec §10, §36) ---------- */
@media (prefers-reduced-motion: reduce){
  selector *, selector *::before, selector *::after{ animation-duration:.001ms!important; animation-iteration-count:1!important; transition-duration:.001ms!important; scroll-behavior:auto!important; }
}`;

/** Small helper: extra per-template CSS appended after the design system. */
export function scopedCss(customCss = '') {
  return customCss ? `${DESIGN_SYSTEM_CSS}\n${customCss}` : DESIGN_SYSTEM_CSS;
}
