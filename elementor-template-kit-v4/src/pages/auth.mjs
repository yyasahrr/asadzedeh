/**
 * DIGITS authentication states (spec §24).
 *
 * The real DIGITS shortcodes mount the working forms; the surrounding shells
 * provide the visual states. If DIGITS renders OTP inside the same form, only
 * the shell styles apply and no fake separate flow is created.
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
} from '../dom.mjs';
import { section, sectionHead, card, stateBlock, metaRow, breadcrumbs, ctaBand, faqBlock } from '../sections/ui.mjs';
import { BRAND, CONTACT } from '../content/site.mjs';
import { sc } from '../shortcodes.mjs';
import { define } from '../registry.mjs';

/** Shared auth shell: intro column + form column. */
function authShell(doc, seed, opts) {
  const { kicker: k, title, lead, code, note, side = [], tone = 'neutral', navTitle, crumbs } = opts;

  const formCard = container(
    doc,
    `${seed}-form-card`,
    [
      heading(doc, `${seed}-form-title`, title, { level: 'h2', title: `H2 — ${title}` }),
      lead ? paragraph(doc, `${seed}-form-lead`, lead, { size: 15, color: C.muted }) : null,
      container(doc, `${seed}-mount`, [shortcodeWidget(doc, `${seed}-sc`, code, { title: `فرم ${title}` })], {
        title: `اتصال ${title}`,
        cls: 'az-mount az-otp az-auth-mount',
        g: 0,
      }),
      note ? paragraph(doc, `${seed}-note`, note, { size: 13, color: C.muted, cls: 'az-form-note' }) : null,
    ].filter(Boolean),
    {
      title: `کارت ${title}`,
      cls: 'az-card az-stack',
      g: 14,
      bg: C.surface,
      border: { color: C.line },
      radius: edge(22),
      padding: { unit: 'px', top: '26', right: '26', bottom: '26', left: '26', isLinked: false },
      responsive: { mobile: { padding: { unit: 'px', top: '18', right: '18', bottom: '18', left: '18', isLinked: false } } },
    }
  );

  const introCol = container(
    doc,
    `${seed}-intro`,
    [
      k ? kicker(doc, `${seed}-kicker`, k, { cls: 'az-kicker az-kicker--teal' }) : null,
      heading(doc, `${seed}-h1`, title, { level: 'h1', title: 'H1 — عنوان صفحه' }),
      lead ? paragraph(doc, `${seed}-lead`, lead, { size: 16, color: C.muted }) : null,
      ...side,
    ].filter(Boolean),
    { title: 'ستون معرفی', cls: 'az-stack az-auth-intro', g: 14 }
  );

  return [
    section(
      doc,
      `${seed}-hero`,
      [
        crumbs ? breadcrumbs(doc, seed, crumbs) : null,
        container(
          doc,
          `${seed}-grid`,
          [introCol, formCard],
          {
            title: 'شبکهٔ احراز هویت',
            cls: 'az-split az-auth-grid',
            direction: 'row',
            wrap: 'wrap',
            g: 32,
            align: 'start',
            responsive: { mobile: { flex_direction: 'column' } },
          }
        ),
      ].filter(Boolean),
      { title: navTitle, cls: 'az-section az-auth', innerCls: 'az-wrap', bg: C.bg }
    ),
  ];
}

function authBuild(doc) {
  return authShell(doc, 'auth', {
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'ورود / ثبت‌نام', url: '/auth' }],
    kicker: 'حساب کاربری',
    title: 'ورود یا ثبت‌نام',
    lead: 'با شمارهٔ تماس وارد شوید؛ کد تأیید برای شما ارسال می‌شود.',
    code: sc('dm-page', { login: 'true', signup: 'true' }),
    note: 'این قالب تنها پوستهٔ بصری است؛ منطق ارسال کد و ورود توسط افزونهٔ Digits اجرا می‌شود و در صورت تغییر شورتکد در نسخهٔ نصب‌شده، باید به‌روزرسانی شود.',
    navTitle: 'Auth — ورود/ثبت‌نام',
    side: [
      container(
        doc,
        'auth-benefits',
        [
          heading(doc, 'auth-ben-title', 'پس از ورود', { level: 'h3', title: 'H3 — پس از ورود' }),
          iconList(doc, 'auth-ben-list', [
            'دسترسی به دوره‌های خریداری‌شده',
            'پیگیری تکالیف و بازخورد مدرس',
            'مشاهده و استعلام گواهی‌ها',
            'تاریخچهٔ سفارش‌ها و فاکتورها',
          ], { title: 'مزایا' }),
        ],
        { title: 'کارت مزایا', cls: 'az-card az-card--flat az-stack', g: 10 }
      ),
      container(
        doc,
        'auth-help',
        [
          paragraph(doc, 'auth-help-text', `در صورت بروز مشکل در دریافت کد، با شمارهٔ ${CONTACT.phone} تماس بگیرید.`, { size: 13.5, color: C.muted, cls: 'az-form-note' }),
          button(doc, 'auth-help-btn', 'صفحهٔ پشتیبانی', '/support', { variant: 'outline', block: true, size: 'sm', title: 'CTA — پشتیبانی' }),
        ],
        { title: 'کارت راهنما', cls: 'az-stack', g: 8 }
      ),
    ],
  });
}

function otpBuild(doc) {
  return authShell(doc, 'otp', {
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'ورود', url: '/auth' }, { label: 'تأیید کد', url: '/auth/verify' }],
    kicker: 'تأیید شماره',
    title: 'کد تأیید را وارد کنید',
    lead: 'کد ارسال‌شده به شمارهٔ تماس خود را وارد کنید.',
    code: sc('dm-page', { login: 'true' }),
    note: 'اگر Digits مرحلهٔ OTP را در همان فرم مدیریت می‌کند، این قالب فقط نمایش را بهبود می‌دهد و نباید جریان جداگانه‌ای ایجاد کرد. وضعیت‌های زیر برای هماهنگی طراحی آماده‌اند.',
    navTitle: 'OTP — تأیید کد',
    side: [
      grid(
        doc,
        'otp-states',
        [
          stateBlock(doc, 'otp-wrong', {
            tone: 'danger',
            icon: 'fas fa-inbox',
            title: 'کد نادرست',
            body: 'کد واردشده صحیح نیست. دوباره تلاش کنید یا کد جدیدی درخواست دهید.',
            actions: [{ label: 'دریافت کد دوباره', url: '#' }],
            navTitle: 'وضعیت — کد نادرست',
          }),
          stateBlock(doc, 'otp-resend', {
            tone: 'neutral',
            icon: 'fas fa-inbox',
            title: 'ارسال دوباره',
            body: 'تا دریافت کد جدید باید کمی صبر کنید؛ شمارش معکوس روی دکمه نمایش داده می‌شود.',
            navTitle: 'وضعیت — شمارش معکوس',
          }),
        ],
        { cols: 1, tablet: 1, mobile: 1, title: 'وضعیت‌ها', cls: 'az-grid az-grid--1' }
      ),
    ],
  });
}

function recoveryBuild(doc) {
  return authShell(doc, 'rec', {
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'ورود', url: '/auth' }, { label: 'بازیابی', url: '/auth/recovery' }],
    kicker: 'بازیابی دسترسی',
    title: 'بازیابی حساب',
    lead: 'اگر به شمارهٔ تماس قبلی دسترسی ندارید، مراحل بازیابی را دنبال کنید.',
    code: sc('dm-forgot-password-page'),
    note: 'روش بازیابی واقعی باید با تنظیمات Digits و سیاست پشتیبانی کارگاه هماهنگ باشد.',
    navTitle: 'Recovery — بازیابی',
    side: [
      container(
        doc,
        'rec-steps',
        [
          heading(doc, 'rec-steps-title', 'مراحل بازیابی', { level: 'h3', title: 'H3 — مراحل' }),
          iconList(doc, 'rec-steps-list', [
            'شمارهٔ تماس ثبت‌شده را وارد کنید.',
            'کد تأیید را دریافت و وارد کنید.',
            'در صورت عدم دسترسی، با پشتیبانی تماس بگیرید.',
          ], { title: 'مراحل' }),
          button(doc, 'rec-btn', 'تماس با پشتیبانی', '/contact', { variant: 'outline', block: true, size: 'sm', title: 'CTA — پشتیبانی' }),
        ],
        { title: 'کارت مراحل', cls: 'az-card az-card--flat az-stack', g: 10 }
      ),
    ],
  });
}

function authErrorBuild(doc) {
  return authShell(doc, 'aerr', {
    crumbs: [{ label: 'خانه', url: '/' }, { label: 'ورود', url: '/auth' }, { label: 'خطا', url: '#' }],
    kicker: 'خطا',
    title: 'ورود انجام نشد',
    lead: 'مشکلی در ورود پیش آمده است. یکی از موارد زیر می‌تواند دلیل آن باشد.',
    code: sc('dm-login-page'),
    note: 'این صفحه پیام خطا را با لحن یکسان نمایش می‌دهد و کاربر را به مسیر درست برمی‌گرداند.',
    navTitle: 'Auth Error — خطا',
    side: [
      container(
        doc,
        'aerr-reasons',
        [
          heading(doc, 'aerr-title', 'دلایل معمول', { level: 'h3', title: 'H3 — دلایل' }),
          iconList(doc, 'aerr-list', [
            'کد تأیید منقضی شده است.',
            'شمارهٔ تماس با قالب درست وارد نشده است.',
            'ارسال پیامک به‌طور موقت با اختلال مواجه است.',
          ], { title: 'دلایل' }),
          container(doc, 'aerr-actions', [button(doc, 'aerr-a1', 'تلاش دوباره', '/auth', { variant: 'primary', block: true, title: 'CTA — تلاش دوباره' }), button(doc, 'aerr-a2', 'پشتیبانی', '/support', { variant: 'outline', block: true, title: 'CTA — پشتیبانی' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }),
        ],
        { title: 'کارت دلایل', cls: 'az-card az-stack', g: 10 }
      ),
    ],
  });
}

export function registerAuth() {
  define({ slug: 'auth', title: 'ورود / ثبت‌نام', docType: 'page', group: 'Auth', page: '/auth', plugins: ['digits'], dynamic: 'dm-page', url: '/auth', condition: '', manual: 'شورتکد Digits را با نسخهٔ نصب‌شده تطبیق دهید.', status: 'READY — NEEDS DYNAMIC BINDING' }, authBuild);
  define({ slug: 'otp', title: 'تأیید کد یک‌بارمصرف', docType: 'page', group: 'Auth', page: '/auth/verify', plugins: ['digits'], dynamic: 'همان فرم Digits (در صورت مدیریت داخلی OTP)', url: '/auth/verify', condition: '', manual: 'اگر Digits مرحلهٔ OTP را جداگانه ارائه نمی‌دهد، این صفحه را به جریان اصلی متصل نکنید.', status: 'READY — NEEDS DYNAMIC BINDING' }, otpBuild);
  define({ slug: 'recovery', title: 'بازیابی حساب', docType: 'page', group: 'Auth', page: '/auth/recovery', plugins: ['digits'], dynamic: 'dm-forgot-password-page', url: '/auth/recovery', condition: '', manual: '', status: 'READY — NEEDS DYNAMIC BINDING' }, recoveryBuild);
  define({ slug: 'auth-error', title: 'خطای ورود', docType: 'page', group: 'Auth', page: '/auth/error', plugins: ['digits', 'elementor'], dynamic: 'dm-login-page', url: '/auth/error', condition: '', manual: '', status: 'READY — NEEDS DYNAMIC BINDING' }, authErrorBuild);
}
