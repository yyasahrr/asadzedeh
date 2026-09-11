/**
 * Commerce + auth + utility families.
 * Cart/checkout keep distractions low (spec §28); every state is a real page.
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
  mediaFrame,
  shortcodeWidget,
  htmlBlock,
  divider,
  spacer,
  patternStrip,
  widget,
  contactForm,
  searchForm,
} from '../dom.mjs';
import {
  section,
  pageHero,
  sectionHead,
  card,
  courseCard,
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
import { NAV, CONTACT, BRAND } from '../content/site.mjs';
import { COURSES, WORKSHOPS } from '../content/catalog.mjs';
import { STATES, UI, FAQ } from '../content/copy.mjs';
import { sc } from '../shortcodes.mjs';
import { define } from '../registry.mjs';

/* ================================================================== CART */
function cartShell(doc, seed, { title, lead, code, emptyStateShown = false, navTitle = 'سبد خرید' }) {
  return [
    pageHero(doc, `${seed}-hero`, {
      crumbs: [{ label: 'خانه', url: '/' }, { label: title, url: '/cart' }],
      kicker: 'سبد خرید',
      title,
      lead,
      navTitle,
      actions: [],
    }),
    section(
      doc,
      `${seed}-body`,
      [
        container(
          doc,
          `${seed}-grid`,
          [
            container(
              doc,
              `${seed}-main`,
              [
                container(doc, `${seed}-mount`, [shortcodeWidget(doc, `${seed}-sc`, code, { title: 'جدول سبد خرید' })], { title: 'سبد خرید', cls: 'az-mount az-woo az-cart-mount', g: 0 }),
                container(
                  doc,
                  `${seed}-coupon`,
                  [
                    heading(doc, `${seed}-coupon-title`, 'کد تخفیف', { level: 'h3', title: 'H3 — کد تخفیف' }),
                    paragraph(doc, `${seed}-coupon-text`, 'در صورت داشتن کد تخفیف، آن را در جدول سبد وارد کنید و روی به‌روزرسانی بزنید.', { size: 14, color: C.muted }),
                  ],
                  { title: 'راهنمای کد تخفیف', cls: 'az-card az-card--flat az-stack', g: 6 }
                ),
              ],
              { title: 'ستون اصلی سبد', cls: 'az-stack', g: 16 }
            ),
            container(
              doc,
              `${seed}-side`,
              [
                container(
                  doc,
                  `${seed}-summary`,
                  [
                    heading(doc, `${seed}-sum-title`, 'خلاصهٔ سبد', { level: 'h3', title: 'H3 — خلاصهٔ سبد' }),
                    htmlBlock(
                      doc,
                      `${seed}-sum-html`,
                      `<div class="az-summary" dir="rtl">
<div class="az-summary-row"><span>جمع جزء</span><strong>REPLACE: مبلغ</strong></div>
<div class="az-summary-row"><span>تخفیف</span><strong>REPLACE: مبلغ</strong></div>
<div class="az-summary-row"><span>مالیات</span><strong>REPLACE: مبلغ</strong></div>
<div class="az-summary-row az-summary-row--total"><span>جمع کل</span><strong>REPLACE: مبلغ کل</strong></div>
</div>`,
                      { title: 'خلاصهٔ سبد', cls: 'az-summary-block' }
                    ),
                    button(doc, `${seed}-checkout`, 'ادامه به تسویه‌حساب', '/checkout', { variant: 'primary', block: true, title: 'CTA — تسویه‌حساب' }),
                    button(doc, `${seed}-continue`, 'ادامهٔ خرید', '/shop', { variant: 'ghost', block: true, title: 'CTA — ادامهٔ خرید' }),
                  ],
                  {
                    title: 'کارت خلاصه',
                    cls: 'az-card az-stack',
                    g: 12,
                    sticky: 'top',
                    customCss: `selector{ top:96px; }\n@media (max-width:860px){ selector{ position:static; top:auto; } }\nselector .az-summary-row{ display:flex; justify-content:space-between; gap:10px; padding:8px 0; border-bottom:1px dashed #193B5C33; font-size:14.5px; }\nselector .az-summary-row--total{ border-bottom:0; font-size:17px; color:${C.navy}; }`,
                  }
                ),
                container(
                  doc,
                  `${seed}-trust`,
                  [
                    heading(doc, `${seed}-trust-title`, 'پیش از پرداخت', { level: 'h4', title: 'H4 — پیش از پرداخت' }),
                    iconList(doc, `${seed}-trust-list`, ['دسترسی دوره بلافاصله پس از پرداخت فعال می‌شود.', 'در صورت مشکل در پرداخت، سفارش در وضعیت در انتظار باقی می‌ماند.'], { title: 'نکات', size: 13 }),
                    button(doc, `${seed}-support`, UI.support, '/support', { variant: 'outline', block: true, size: 'sm', title: 'CTA — پشتیبانی' }),
                  ],
                  { title: 'کارت اعتماد', cls: 'az-card az-card--flat az-stack', g: 8 }
                ),
              ],
              { title: 'ستون کناری سبد', cls: 'az-stack', g: 14 }
            ),
          ],
          {
            title: 'شبکهٔ سبد',
            cls: 'az-split az-cart-grid',
            direction: 'row',
            wrap: 'wrap',
            g: 26,
            align: 'start',
            responsive: { mobile: { flex_direction: 'column' } },
          }
        ),
        emptyStateShown
          ? emptyState(doc, `${seed}-empty-state`, STATES.cartEmpty, { navTitle: 'وضعیت خالی — سبد' })
          : null,
      ].filter(Boolean),
      { title: `${title} — بدنه`, cls: 'az-section', innerCls: 'az-wrap' }
    ),
    section(
      doc,
      `${seed}-suggest`,
      [
        sectionHead(doc, `${seed}-suggest`, { title: 'شاید این‌ها هم مناسب باشد', link: { label: 'همهٔ دوره‌ها', url: '/courses' } }),
        grid(doc, `${seed}-suggest-grid`, COURSES.slice(0, 3).map((c, i) => courseCard(doc, `${seed}-s-${i}`, c)), { cols: 3, tablet: 2, mobile: 1, title: 'پیشنهادها', cls: 'az-grid az-grid--3' }),
      ],
      { title: `${title} — پیشنهادها`, cls: 'az-section', innerCls: 'az-wrap', bg: C.surface }
    ),
  ];
}

function cartBuild(doc) {
  return cartShell(doc, 'cart', {
    title: 'سبد خرید',
    lead: 'موارد انتخابی شما پیش از پرداخت.',
    code: sc('woocommerce_cart'),
    navTitle: 'Cart — سربرگ',
  });
}

function cartEmptyBuild(doc) {
  return [
    pageHero(doc, 'cemp-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'سبد خرید', url: '/cart' }],
      kicker: 'سبد خرید',
      title: 'سبد خرید شما خالی است',
      lead: 'موردی برای پرداخت انتخاب نشده است.',
      navTitle: 'Cart Empty — سربرگ',
    }),
    section(
      doc,
      'cemp-body',
      [
        emptyState(doc, 'cemp-state', STATES.cartEmpty, { navTitle: 'وضعیت خالی — سبد' }),
        sectionHead(doc, 'cemp-suggest', { title: 'از اینجا شروع کنید' }),
        grid(
          doc,
          'cemp-grid',
          [
            card(doc, 'cemp-1', { navTitle: 'پیشنهاد — دوره', icon: { value: 'fas fa-video', library: 'fa-solid' }, title: 'دورهٔ آنلاین', lead: 'یادگیری گام‌به‌گام با بررسی تکلیف.', actions: [{ label: 'مشاهدهٔ دوره‌ها', url: '/courses' }] }),
            card(doc, 'cemp-2', { navTitle: 'پیشنهاد — مسیر', icon: { value: 'fas fa-route', library: 'fa-solid' }, title: 'مسیر یادگیری', lead: 'چند دوره با هدف مشخص.', actions: [{ label: 'مشاهدهٔ مسیرها', url: '/learning-paths' }] }),
            card(doc, 'cemp-3', { navTitle: 'پیشنهاد — کلاس', icon: { value: 'fas fa-hands-holding', library: 'fa-solid' }, title: 'کلاس حضوری', lead: 'کار روی دار در کارگاه.', actions: [{ label: 'مشاهدهٔ کلاس‌ها', url: '/workshops', variant: 'accent' }] }),
          ],
          { cols: 3, tablet: 2, mobile: 1, title: 'پیشنهادها', cls: 'az-grid az-grid--3' }
        ),
      ],
      { title: 'Cart Empty — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
    ctaBand(doc, 'cemp-cta', { title: 'در انتخاب تردید دارید؟', body: 'صفحهٔ راهنما بر اساس هدف شما پیشنهاد می‌دهد.', primary: { label: 'از کجا شروع کنم؟', url: '/start-here' }, navTitle: 'Cart Empty — دعوت به اقدام' }),
  ];
}

/* ============================================================== CHECKOUT */
function checkoutShell(doc, seed, { title, lead, code, navTitle, showErrors = true }) {
  return [
    pageHero(doc, `${seed}-hero`, {
      crumbs: [{ label: 'خانه', url: '/' }, { label: title, url: '/checkout' }],
      kicker: 'تسویه‌حساب',
      title,
      lead,
      navTitle,
    }),
    section(
      doc,
      `${seed}-body`,
      [
        container(
          doc,
          `${seed}-grid`,
          [
            container(
              doc,
              `${seed}-main`,
              [
                container(doc, `${seed}-mount`, [shortcodeWidget(doc, `${seed}-sc`, code, { title: 'فرم تسویه‌حساب' })], { title: 'فرم تسویه‌حساب', cls: 'az-mount az-woo az-checkout-mount', g: 0 }),
                showErrors
                  ? container(
                      doc,
                      `${seed}-errors`,
                      [
                        heading(doc, `${seed}-err-title`, 'نمونهٔ خطاهای اعتبارسنجی', { level: 'h3', title: 'H3 — خطاها' }),
                        htmlBlock(
                          doc,
                          `${seed}-err-html`,
                          `<div class="az-errors" dir="rtl">
<ul class="woocommerce-error" role="alert"><li>فیلد نام و نام خانوادگی الزامی است.</li><li>شماره تماس واردشده معتبر نیست.</li></ul>
<div class="az-field-error"><label for="demo-billing-phone">شماره تماس</label><input id="demo-billing-phone" type="tel" aria-invalid="true" aria-describedby="demo-phone-error" value="" /><small id="demo-phone-error" class="az-form-error">شماره تماس را با فرمت 09xxxxxxxxx وارد کنید.</small></div>
</div>`,
                          { title: 'نمونهٔ خطاها', cls: 'az-errors-block' }
                        ),
                      ],
                      { title: 'بخش — خطاها', cls: 'az-card az-stack', g: 12 }
                    )
                  : null,
              ].filter(Boolean),
              { title: 'ستون اصلی تسویه', cls: 'az-stack', g: 16 }
            ),
            container(
              doc,
              `${seed}-side`,
              [
                container(
                  doc,
                  `${seed}-review`,
                  [
                    heading(doc, `${seed}-rev-title`, 'خلاصهٔ سفارش', { level: 'h3', title: 'H3 — خلاصهٔ سفارش' }),
                    htmlBlock(
                      doc,
                      `${seed}-rev-html`,
                      `<div class="az-summary" dir="rtl">
<div class="az-summary-row"><span>REPLACE: نام دوره</span><strong>REPLACE: مبلغ</strong></div>
<div class="az-summary-row"><span>REPLACE: کلاس حضوری</span><strong>REPLACE: مبلغ</strong></div>
<div class="az-summary-row az-summary-row--total"><span>جمع کل</span><strong>REPLACE: مبلغ کل</strong></div>
</div>`,
                      { title: 'خلاصهٔ سفارش', cls: 'az-summary-block' }
                    ),
                  ],
                  { title: 'کارت خلاصهٔ سفارش', cls: 'az-card az-stack', g: 10 }
                ),
                container(
                  doc,
                  `${seed}-help`,
                  [
                    heading(doc, `${seed}-help-title`, 'نیاز به کمک دارید؟', { level: 'h4', title: 'H4 — کمک' }),
                    paragraph(doc, `${seed}-help-text`, `در صورت بروز مشکل در پرداخت، با شمارهٔ ${CONTACT.phone} تماس بگیرید یا از صفحهٔ پشتیبانی پیام بدهید.`, { size: 14, color: C.muted }),
                    button(doc, `${seed}-help-btn`, 'تماس با کارگاه', '/contact', { variant: 'outline', block: true, size: 'sm', title: 'CTA — تماس' }),
                  ],
                  { title: 'کارت راهنما', cls: 'az-card az-card--flat az-stack', g: 8 }
                ),
              ],
              { title: 'ستون کناری تسویه', cls: 'az-stack', g: 14 }
            ),
          ],
          {
            title: 'شبکهٔ تسویه',
            cls: 'az-split az-checkout-grid',
            direction: 'row',
            wrap: 'wrap',
            g: 26,
            align: 'start',
            responsive: { mobile: { flex_direction: 'column' } },
            customCss: `@media (max-width:860px){ selector > .elementor-element:last-child{ order:-1; } }`,
          }
        ),
      ],
      { title: `${title} — بدنه`, cls: 'az-section', innerCls: 'az-wrap' }
    ),
  ];
}

function checkoutBuild(doc) {
  return checkoutShell(doc, 'chk', { title: 'تسویه‌حساب', lead: 'اطلاعات خود را تکمیل کنید و پرداخت را انجام دهید.', code: sc('woocommerce_checkout'), navTitle: 'Checkout — سربرگ' });
}

function checkoutErrorBuild(doc) {
  return checkoutShell(doc, 'chke', {
    title: 'تسویه‌حساب — اصلاح خطاها',
    lead: 'برخی فیلدها نیاز به اصلاح دارند. خطاها بالای فرم نمایش داده می‌شوند.',
    code: sc('woocommerce_checkout'),
    navTitle: 'Checkout Error — سربرگ',
    showErrors: true,
  });
}

/* ========================================================= PAYMENT STATES */
function paymentStateBuild(slug, state, tone, extra) {
  return (doc) => [
    pageHero(doc, `${slug}-hero`, {
      crumbs: [{ label: 'خانه', url: '/' }, { label: state.title, url: '#' }],
      kicker: tone === 'success' ? 'پرداخت موفق' : 'پرداخت ناموفق',
      title: state.title,
      lead: state.body,
      navTitle: `${state.title} — سربرگ`,
    }),
    section(
      doc,
      `${slug}-body`,
      [
        stateBlock(doc, `${slug}-state`, {
          tone,
          icon: 'fas fa-inbox',
          title: state.title,
          body: state.body,
          actions: [{ label: state.cta, url: state.url }],
          navTitle: `وضعیت — ${state.title}`,
        }),
        ...extra(doc),
      ],
      { title: `${state.title} — بدنه`, cls: 'az-section', innerCls: 'az-wrap az-narrow' }
    ),
  ];
}

const paymentSuccessExtra = (d) => [
  container(
    d,
    'psucc-next',
    [
      heading(d, 'psucc-next-title', 'گام بعدی', { level: 'h2', title: 'H2 — گام بعدی' }),
      iconList(d, 'psucc-next-list', ['دسترسی به دوره فعال شده است.', 'فاکتور در بخش سفارش‌های من در دسترس است.', 'در صورت خرید کلاس حضوری، برنامهٔ جلسات ارسال می‌شود.'], { title: 'گام‌ها' }),
      container(d, 'psucc-actions', [button(d, 'psucc-a1', 'رفتن به دوره‌های من', '/dashboard/courses', { variant: 'primary', block: true, title: 'CTA — دوره‌های من' }), button(d, 'psucc-a2', 'مشاهدهٔ سفارش', '/dashboard/orders', { variant: 'outline', block: true, title: 'CTA — سفارش‌ها' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }),
    ],
    { title: 'بخش — گام بعدی', cls: 'az-card az-stack', g: 12 }
  ),
];

const paymentFailedExtra = (d) => [
  container(
    d,
    'pfail-reasons',
    [
      heading(d, 'pfail-title', 'دلایل معمول', { level: 'h2', title: 'H2 — دلایل معمول' }),
      iconList(d, 'pfail-list', ['موجودی یا سقف تراکنش کافی نبوده است.', 'اطلاعات کارت یا رمز دوم نادرست وارد شده است.', 'اتصال در میانهٔ پرداخت قطع شده است.'], { title: 'دلایل' }),
      container(d, 'pfail-actions', [button(d, 'pfail-a1', 'تلاش دوباره', '/checkout', { variant: 'primary', block: true, title: 'CTA — تلاش دوباره' }), button(d, 'pfail-a2', 'پشتیبانی', '/support', { variant: 'outline', block: true, title: 'CTA — پشتیبانی' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 12, responsive: { mobile: { flex_direction: 'column' } } }),
    ],
    { title: 'بخش — دلایل', cls: 'az-card az-stack', g: 12 }
  ),
  container(
    d,
    'pfail-note',
    [paragraph(d, 'pfail-note-text', 'اگر مبلغی از حساب شما کسر شده اما سفارش ثبت نشده است، مبلغ طبق قوانین بانکی بازمی‌گردد.', { size: 13.5, color: C.muted, cls: 'az-form-note' })],
    { title: 'یادداشت', cls: 'az-card az-card--flat', g: 0 }
  ),
];

/* ============================================================ MY ACCOUNT */
function myAccountBuild(doc) {
  return [
    pageHero(doc, 'acc-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'حساب کاربری', url: '/my-account' }],
      kicker: 'حساب کاربری',
      title: 'حساب کاربری',
      lead: 'سفارش‌ها، دانلودها، نشانی‌ها و تنظیمات حساب.',
      navTitle: 'My Account — سربرگ',
    }),
    section(
      doc,
      'acc-body',
      [
        container(doc, 'acc-mount', [shortcodeWidget(doc, 'acc-sc', sc('woocommerce_my_account'), { title: 'حساب کاربری ووکامرس' })], { title: 'بدنهٔ حساب', cls: 'az-mount az-woo az-account-mount', g: 0 }),
        container(
          doc,
          'acc-links',
          [
            heading(doc, 'acc-links-title', 'دسترسی سریع', { level: 'h2', title: 'H2 — دسترسی سریع' }),
            grid(
              doc,
              'acc-links-grid',
              [
                { label: 'پنل هنرجو', url: '/dashboard' },
                { label: 'سفارش‌های من', url: '/dashboard/orders' },
                { label: 'گواهی‌ها', url: '/dashboard/certificates' },
                { label: 'پشتیبانی', url: '/support' },
              ].map((l, i) => card(doc, `acc-l-${i}`, { navTitle: `میانبر — ${l.label}`, title: l.label, actions: [{ label: 'باز کردن', url: l.url, variant: 'ghost' }] })),
              { cols: 4, tablet: 2, mobile: 1, title: 'میانبرها', cls: 'az-grid az-grid--4' }
            ),
          ],
          { title: 'بخش — دسترسی سریع', cls: 'az-stack', g: 14 }
        ),
      ],
      { title: 'My Account — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
  ];
}

/* ======================================================== ORDER TRACKING */
function orderTrackingBuild(doc) {
  return [
    pageHero(doc, 'otr-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'پیگیری سفارش', url: '/order-tracking' }],
      kicker: 'پیگیری',
      title: 'پیگیری سفارش',
      lead: 'شمارهٔ سفارش و ایمیل یا شمارهٔ تماس ثبت‌شده را وارد کنید.',
      navTitle: 'Order Tracking — سربرگ',
    }),
    section(
      doc,
      'otr-body',
      [
        container(doc, 'otr-mount', [shortcodeWidget(doc, 'otr-sc', sc('az_order_tracking'), { title: 'فرم پیگیری سفارش' })], { title: 'فرم پیگیری', cls: 'az-mount az-form', g: 0 }),
        container(doc, 'otr-alt', [shortcodeWidget(doc, 'otr-alt-sc', sc('woocommerce_order_tracking'), { title: 'جایگزین ووکامرس' })], { title: 'جایگزین', cls: 'az-mount', g: 0 }),
        container(
          doc,
          'otr-note',
          [paragraph(doc, 'otr-note-text', 'فرم سفارشی با nonce اجرا می‌شود و تنها وضعیت سفارش‌هایی را نشان می‌دهد که با شماره و ایمیل/شمارهٔ تماس مطابقت داشته باشند.', { size: 13, color: C.muted, cls: 'az-form-note' })],
          { title: 'یادداشت', cls: 'az-card az-card--flat', g: 0 }
        ),
      ],
      { title: 'Order Tracking — بدنه', cls: 'az-section', innerCls: 'az-wrap az-narrow' }
    ),
  ];
}

/* ============================================================== PREORDER */
function preorderBuild(doc) {
  return [
    pageHero(doc, 'pre-hero', {
      crumbs: [{ label: 'خانه', url: '/' }, { label: 'پیش‌خرید', url: '/preorder' }],
      kicker: 'پیش‌خرید',
      title: 'در لیست انتظار قرار بگیرید',
      lead: 'اگر ظرفیت یک کلاس تکمیل شده است، با ثبت درخواست در نوبت بعدی مطلع می‌شوید.',
      navTitle: 'Preorder — سربرگ',
    }),
    section(
      doc,
      'pre-body',
      [
        container(
          doc,
          'pre-grid',
          [
            container(
              doc,
              'pre-form',
              [
                heading(doc, 'pre-form-title', 'فرم درخواست', { level: 'h2', title: 'H2 — فرم درخواست' }),
                container(doc, 'pre-mount', [shortcodeWidget(doc, 'pre-sc', sc('az_preorder_form'), { title: 'فرم پیش‌خرید' })], { title: 'فرم', cls: 'az-mount az-form', g: 0 }),
                contactForm(doc, 'pre-fallback', {
                  fields: [
                    { id: 'name', label: 'نام و نام خانوادگی', placeholder: 'نام کامل', width: '50', required: 'true' },
                    { id: 'phone', label: 'شماره تماس', type: 'tel', placeholder: '09xxxxxxxxx', width: '50', required: 'true' },
                    { id: 'item', label: 'کلاس یا دورهٔ مورد نظر', type: 'select', options: ['کلاس حضوری گلیم‌بافی', 'کارگاه فشردهٔ رنگرزی گیاهی', 'کارگاه گره‌زنی روی دار'], required: 'true' },
                  ],
                  button: 'ثبت درخواست',
                  title: 'فرم جایگزین',
                }),
              ],
              { title: 'ستون فرم', cls: 'az-stack', g: 14 }
            ),
            container(
              doc,
              'pre-side',
              [
                container(
                  doc,
                  'pre-states',
                  [
                    heading(doc, 'pre-states-title', 'وضعیت‌های احتمالی', { level: 'h3', title: 'H3 — وضعیت‌ها' }),
                    iconList(doc, 'pre-states-list', ['در انتظار: درخواست ثبت شده است.', 'نوبت رسیده: ظرفیت آزاد شده و به شما اطلاع داده می‌شود.', 'تکمیل ظرفیت: امکان ثبت‌نام مستقیم وجود دارد.'], { title: 'وضعیت‌ها', size: 13.5 }),
                  ],
                  { title: 'کارت — وضعیت‌ها', cls: 'az-card az-stack', g: 10 }
                ),
                container(
                  doc,
                  'pre-contact',
                  [
                    heading(doc, 'pre-contact-title', 'راه دیگر', { level: 'h3', title: 'H3 — راه دیگر' }),
                    paragraph(doc, 'pre-contact-text', `می‌توانید مستقیماً با کارگاه تماس بگیرید: ${CONTACT.phone}`, { size: 14.5, color: C.muted }),
                    button(doc, 'pre-contact-btn', 'تماس با کارگاه', '/contact', { variant: 'outline', block: true, size: 'sm', title: 'CTA — تماس' }),
                  ],
                  { title: 'کارت — تماس', cls: 'az-card az-card--cream az-stack', g: 10 }
                ),
              ],
              { title: 'ستون کناری', cls: 'az-stack', g: 14 }
            ),
          ],
          { title: 'شبکهٔ پیش‌خرید', cls: 'az-split', direction: 'row', wrap: 'wrap', g: 26, responsive: { mobile: { flex_direction: 'column' } } }
        ),
      ],
      { title: 'Preorder — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
  ];
}

export function registerCommerce() {
  define({ slug: 'cart', title: 'سبد خرید', docType: 'page', group: 'Commerce', page: '/cart', plugins: ['woocommerce'], dynamic: 'woocommerce_cart', url: '/cart', condition: '', manual: '', status: 'READY' }, cartBuild);
  define({ slug: 'cart-empty', title: 'سبد خرید — خالی', docType: 'page', group: 'Commerce', page: '/cart (حالت خالی)', plugins: ['elementor'], dynamic: '', url: '/cart', condition: '', manual: 'در صورت استفاده از ووکامرس، این صفحه به‌عنوان جایگزین خالی نمایش داده می‌شود.', status: 'READY' }, cartEmptyBuild);
  define({ slug: 'checkout', title: 'تسویه‌حساب', docType: 'page', group: 'Commerce', page: '/checkout', plugins: ['woocommerce', 'persian-woocommerce'], dynamic: 'woocommerce_checkout', url: '/checkout', condition: '', manual: 'سربرگ ساده‌شده برای کاهش حواس‌پرتی؛ هدر اصلی را غیرفعال کنید.', status: 'READY' }, checkoutBuild);
  define({ slug: 'checkout-error', title: 'تسویه‌حساب — خطا', docType: 'page', group: 'Commerce', page: '/checkout (حالت خطا)', plugins: ['woocommerce'], dynamic: 'woocommerce_checkout', url: '/checkout', condition: '', manual: 'نمونهٔ خطاها برای بررسی ظاهری است.', status: 'READY' }, checkoutErrorBuild);
  define({ slug: 'payment-success', title: 'پرداخت موفق', docType: 'page', group: 'Commerce', page: '/checkout/success', plugins: ['elementor', 'woocommerce'], dynamic: 'سفارش ووکامرس', url: '/checkout/success', condition: '', manual: 'این صفحه را به Thank You page ووکامرس متصل کنید.', status: 'READY' }, paymentStateBuild('payment-success', STATES.paymentSuccess, 'success', paymentSuccessExtra));
  define({ slug: 'payment-failed', title: 'پرداخت ناموفق', docType: 'page', group: 'Commerce', page: '/checkout/failed', plugins: ['elementor', 'woocommerce'], dynamic: '', url: '/checkout/failed', condition: '', manual: '', status: 'READY' }, paymentStateBuild('payment-failed', STATES.paymentFailed, 'danger', paymentFailedExtra));
  define({ slug: 'my-account', title: 'حساب کاربری', docType: 'page', group: 'Commerce', page: '/my-account', plugins: ['woocommerce'], dynamic: 'woocommerce_my_account', url: '/my-account', condition: '', manual: 'پیوندها با پنل هنرجو یکسان شده است.', status: 'READY' }, myAccountBuild);
  define({ slug: 'order-tracking', title: 'پیگیری سفارش', docType: 'page', group: 'Commerce', page: '/order-tracking', plugins: ['woocommerce', 'kit-php'], dynamic: 'az_order_tracking', url: '/order-tracking', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, orderTrackingBuild);
  define({ slug: 'preorder', title: 'پیش‌خرید / لیست انتظار', docType: 'page', group: 'Commerce', page: '/preorder', plugins: ['elementor-pro', 'kit-php'], dynamic: 'az_preorder_form', url: '/preorder', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, preorderBuild);
}
