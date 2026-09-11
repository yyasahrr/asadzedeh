/**
 * Student dashboard family (spec §21–§23).
 * Composed dashboards built on real LearnDash/Woo data via kit shortcodes —
 * never a bare [ld_profile].
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
  progressBar,
  contactForm,
} from '../dom.mjs';
import {
  section,
  sectionHead,
  card,
  courseCard,
  workshopCard,
  mount,
  ctaBand,
  faqBlock,
  proseBlock,
  stateBlock,
  emptyState,
  metaRow,
  breadcrumbs,
  statTiles,
  dashboardShell,
  toPersianNum,
} from '../sections/ui.mjs';
import { NAV } from '../content/site.mjs';
import { COURSES, WORKSHOPS } from '../content/catalog.mjs';
import { STATES, UI, FAQ } from '../content/copy.mjs';
import { sc } from '../shortcodes.mjs';
import { define } from '../registry.mjs';

const shell = (active, title, lead) => ({ active, title, lead });

/* ============================================================ DASHBOARD */
function dashboardBuild(doc) {
  return [
    dashboardShell(doc, 'dash', {
      active: 'dashboard',
      nav: NAV.student,
      title: 'سلام، هنرجوی عزیز',
      lead: 'خلاصهٔ وضعیت یادگیری، تکالیف و سفارش‌های شما.',
      navTitle: 'Dashboard — پنل',
      children: [
        statTiles(doc, 'dash-stats', { code: sc('az_dashboard_stats'), navTitle: 'کاشی‌های آمار واقعی' }),

        container(
          doc,
          'dash-continue',
          [
            heading(doc, 'dash-continue-title', 'ادامهٔ یادگیری', { level: 'h2', title: 'H2 — ادامهٔ یادگیری' }),
            container(doc, 'dash-continue-mount', [shortcodeWidget(doc, 'dash-continue-sc', sc('az_continue_learning'), { title: 'آخرین درس باز شده' })], { title: 'ادامهٔ یادگیری (داینامیک)', cls: 'az-mount', g: 0 }),
            container(
              doc,
              'dash-continue-sample',
              [
                container(
                  doc,
                  'dash-continue-card',
                  [
                    container(
                      doc,
                      'dash-continue-grid',
                      [
                        container(doc, 'dash-continue-media', [mediaFrame(doc, 'dash-continue-frame', { label: 'درس جاری', note: 'جای تصویر', ratio: '16 / 9', title: 'تصویر درس' })], { title: 'تصویر', cls: 'az-continue-media', g: 0, width: { unit: '%', size: '34' } }),
                        container(
                          doc,
                          'dash-continue-copy',
                          [
                            metaRow(doc, 'dash-cc', ['ادامه از درس ۳'], { title: 'برچسب' }),
                            heading(doc, 'dash-cc-title', 'نام دوره‌ای که ادامه دارد', { level: 'h3', title: 'H3 — عنوان دوره' }),
                            paragraph(doc, 'dash-cc-text', 'آخرین درسی که باز کرده بودید در اینجا نمایش داده می‌شود و با کلیک ادامه پیدا می‌کند.', { size: 14.5, color: C.muted }),
                            button(doc, 'dash-cc-btn', UI.continue, '#', { variant: 'primary', block: true, title: 'CTA — ادامهٔ یادگیری' }),
                          ],
                          { title: 'متن', cls: 'az-stack', g: 10, width: { unit: '%', size: '66' } }
                        ),
                      ],
                      { title: 'شبکهٔ ادامه', cls: 'az-continue-row', direction: 'row', wrap: 'wrap', g: 18, responsive: { mobile: { flex_direction: 'column' } } }
                    ),
                  ],
                  { title: 'کارت ادامهٔ یادگیری', cls: 'az-card', g: 0 }
                ),
              ],
              { title: 'نمونهٔ ادامهٔ یادگیری', cls: 'az-mount', g: 0 }
            ),
          ],
          { title: 'بخش — ادامهٔ یادگیری', cls: 'az-stack', g: 14 }
        ),

        container(
          doc,
          'dash-active',
          [
            heading(doc, 'dash-active-title', 'دوره‌های فعال', { level: 'h2', title: 'H2 — دوره‌های فعال' }),
            container(doc, 'dash-active-mount', [shortcodeWidget(doc, 'dash-active-sc', sc('az_my_courses', { limit: 3 }), { title: 'دوره‌های من' })], { title: 'دوره‌های فعال (داینامیک)', cls: 'az-mount', g: 0 }),
            grid(doc, 'dash-active-sample', COURSES.slice(0, 2).map((c, i) => courseCard(doc, `dash-ac-${i}`, c)), { cols: 2, tablet: 2, mobile: 1, title: 'نمونهٔ دوره‌های فعال', cls: 'az-grid az-grid--2' }),
          ],
          { title: 'بخش — دوره‌های فعال', cls: 'az-stack', g: 14 }
        ),

        grid(
          doc,
          'dash-mini',
          [
            container(
              doc,
              'dash-assign',
              [
                heading(doc, 'dash-assign-title', 'تکالیف نیازمند اقدام', { level: 'h3', title: 'H3 — تکالیف' }),
                container(doc, 'dash-assign-mount', [shortcodeWidget(doc, 'dash-assign-sc', sc('az_assignments', { limit: 3 }), { title: 'تکالیف' })], { title: 'تکالیف (داینامیک)', cls: 'az-mount', g: 0 }),
                button(doc, 'dash-assign-btn', 'رفتن به تکالیف', '/dashboard/assignments', { variant: 'outline', block: true, size: 'sm', title: 'CTA — تکالیف' }),
              ],
              { title: 'کارت — تکالیف', cls: 'az-card az-stack', g: 10 }
            ),
            container(
              doc,
              'dash-certs',
              [
                heading(doc, 'dash-certs-title', 'گواهی‌ها', { level: 'h3', title: 'H3 — گواهی‌ها' }),
                container(doc, 'dash-certs-mount', [shortcodeWidget(doc, 'dash-certs-sc', sc('az_my_certificates'), { title: 'گواهی‌ها' })], { title: 'گواهی‌ها (داینامیک)', cls: 'az-mount', g: 0 }),
                button(doc, 'dash-certs-btn', 'مشاهدهٔ گواهی‌ها', '/dashboard/certificates', { variant: 'outline', block: true, size: 'sm', title: 'CTA — گواهی‌ها' }),
              ],
              { title: 'کارت — گواهی‌ها', cls: 'az-card az-stack', g: 10 }
            ),
          ],
          { cols: 2, tablet: 2, mobile: 1, title: 'تکالیف و گواهی‌ها', cls: 'az-grid az-grid--2' }
        ),

        container(
          doc,
          'dash-orders',
          [
            heading(doc, 'dash-orders-title', 'آخرین سفارش‌ها', { level: 'h2', title: 'H2 — آخرین سفارش‌ها' }),
            container(doc, 'dash-orders-mount', [shortcodeWidget(doc, 'dash-orders-sc', sc('az_my_orders', { limit: 3 }), { title: 'سفارش‌های اخیر' })], { title: 'سفارش‌ها (داینامیک)', cls: 'az-mount', g: 0 }),
            button(doc, 'dash-orders-btn', 'همهٔ سفارش‌ها', '/dashboard/orders', { variant: 'ghost', block: true, size: 'sm', title: 'CTA — سفارش‌ها' }),
          ],
          { title: 'بخش — سفارش‌ها', cls: 'az-stack', g: 12 }
        ),

        container(
          doc,
          'dash-quick',
          [
            heading(doc, 'dash-quick-title', 'دسترسی سریع', { level: 'h2', title: 'H2 — دسترسی سریع' }),
            grid(
              doc,
              'dash-quick-grid',
              [
                { label: 'دوره‌های من', url: '/dashboard/courses' },
                { label: 'کلاس‌های من', url: '/dashboard/classes' },
                { label: 'تکالیف', url: '/dashboard/assignments' },
                { label: 'گواهی‌ها', url: '/dashboard/certificates' },
              ].map((q, i) => card(doc, `dash-q-${i}`, { navTitle: `میانبر — ${q.label}`, title: q.label, actions: [{ label: 'باز کردن', url: q.url, variant: 'ghost' }] })),
              { cols: 4, tablet: 2, mobile: 1, title: 'میانبرها', cls: 'az-grid az-grid--4' }
            ),
          ],
          { title: 'بخش — دسترسی سریع', cls: 'az-stack', g: 14 }
        ),
      ],
    }),
  ];
}

/* =========================================================== MY COURSES */
function myCoursesBuild(doc) {
  return [
    dashboardShell(doc, 'mc', {
      active: 'courses',
      nav: NAV.student,
      title: 'دوره‌های من',
      lead: 'دوره‌هایی که ثبت‌نام کرده‌اید به همراه درصد پیشرفت واقعی.',
      navTitle: 'My Courses — پنل',
      children: [
        statTiles(doc, 'mc-stats', { navTitle: 'آمار دوره‌ها' }),
        container(
          doc,
          'mc-list',
          [
            container(doc, 'mc-mount', [shortcodeWidget(doc, 'mc-mount-sc', sc('az_my_courses', { limit: 12 }), { title: 'دوره‌های من (داینامیک)' })], { title: 'فهرست دوره‌ها', cls: 'az-mount', g: 0 }),
            container(doc, 'mc-empty', [emptyState(doc, 'mc-empty-state', STATES.emptyCourses, { navTitle: 'وضعیت خالی — دوره‌ها' })], { title: 'وضعیت خالی', cls: 'az-empty-slot', g: 0, customCss: `selector{ display:none; }` }),
          ],
          { title: 'بخش — فهرست', cls: 'az-stack', g: 16 }
        ),
        container(
          doc,
          'mc-filter',
          [
            htmlBlock(
              doc,
              'mc-filter-html',
              `<div class="az-filter-row" dir="rtl"><span class="az-filter-label">نمایش:</span><a class="az-badge" href="#">در حال یادگیری</a><a class="az-badge" href="#">تکمیل‌شده</a><a class="az-badge" href="#">همه</a></div>`,
              { title: 'فیلتر دوره‌ها', cls: 'az-filter-row-wrap' }
            ),
          ],
          { title: 'بخش — فیلتر', cls: 'az-filters', g: 0 }
        ),
        grid(doc, 'mc-sample', COURSES.slice(0, 2).map((c, i) => courseCard(doc, `mc-s-${i}`, c)), { cols: 2, tablet: 2, mobile: 1, title: 'نمونه دوره‌ها', cls: 'az-grid az-grid--2' }),
        ctaBand(doc, 'mc-cta', { title: 'دورهٔ تازه‌ای شروع کنید', body: 'فهرست دوره‌ها را مرور کنید یا مسیر یادگیری انتخاب کنید.', primary: { label: 'مشاهدهٔ دوره‌ها', url: '/courses' }, navTitle: 'My Courses — دعوت به اقدام' }),
      ],
    }),
  ];
}

/* =========================================================== MY CLASSES */
function myClassesBuild(doc) {
  return [
    dashboardShell(doc, 'mcl', {
      active: 'classes',
      nav: NAV.student,
      title: 'کلاس‌های حضوری من',
      lead: 'برنامهٔ کلاس‌هایی که ثبت‌نام کرده‌اید.',
      navTitle: 'My Classes — پنل',
      children: [
        container(doc, 'mcl-mount', [shortcodeWidget(doc, 'mcl-mount-sc', sc('az_my_workshops'), { title: 'کلاس‌های من (داینامیک)' })], { title: 'کلاس‌های من', cls: 'az-mount', g: 0 }),
        container(doc, 'mcl-empty', [emptyState(doc, 'mcl-empty-state', STATES.emptyWorkshops, { navTitle: 'وضعیت خالی — کلاس‌ها' })], { title: 'وضعیت خالی', cls: 'az-empty-slot', g: 0, customCss: `selector{ display:none; }` }),
        sectionHead(doc, 'mcl-next', { title: 'کلاس بعدی', lead: 'نشانی سالن و وسایل مورد نیاز پیش از شروع ارسال می‌شود.' }),
        grid(doc, 'mcl-sample', WORKSHOPS.slice(0, 2).map((w, i) => workshopCard(doc, `mcl-s-${i}`, w)), { cols: 2, tablet: 2, mobile: 1, title: 'نمونه کلاس‌ها', cls: 'az-grid az-grid--2' }),
        ctaBand(doc, 'mcl-cta', { title: 'کلاس بعدی را رزرو کنید', body: 'ظرفیت کلاس‌ها محدود است.', primary: { label: 'مشاهدهٔ کلاس‌ها', url: '/workshops' }, navTitle: 'My Classes — دعوت به اقدام' }),
      ],
    }),
  ];
}

/* ========================================================== ASSIGNMENTS */
function assignmentsBuild(doc) {
  const statusCard = (tone, title, body, badge) =>
    container(
      doc,
      `as-${tone}`,
      [
        container(
          doc,
          `as-${tone}-head`,
          [
            heading(doc, `as-${tone}-title`, title, { level: 'h4', title: `H4 — ${title}` }),
            paragraph(doc, `as-${tone}-badge`, badge, { size: 12.5, weight: '700', cls: `az-badge az-badge--${tone === 'new' ? 'info' : tone === 'review' ? 'warn' : tone === 'approved' ? 'success' : 'danger'}`, margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true } }),
          ],
          { title: `سربرگ ${title}`, cls: 'az-row', direction: 'row', wrap: 'wrap', justify: 'space-between', align: 'center', g: 8 }
        ),
        paragraph(doc, `as-${tone}-body`, body, { size: 14.5, color: C.muted }),
      ],
      { title: `کارت — ${title}`, cls: 'az-card az-stack', g: 8 }
    );

  return [
    dashboardShell(doc, 'asg', {
      active: 'assignments',
      nav: NAV.student,
      title: 'تکالیف',
      lead: 'تکالیف ارسالی و وضعیت بررسی هر کدام.',
      navTitle: 'Assignments — پنل',
      children: [
        container(doc, 'asg-mount', [shortcodeWidget(doc, 'asg-mount-sc', sc('az_assignments'), { title: 'تکالیف واقعی' })], { title: 'تکالیف (داینامیک)', cls: 'az-mount', g: 0 }),
        container(doc, 'asg-empty', [emptyState(doc, 'asg-empty-state', STATES.emptyAssignments, { navTitle: 'وضعیت خالی — تکالیف' })], { title: 'وضعیت خالی', cls: 'az-empty-slot', g: 0, customCss: `selector{ display:none; }` }),
        sectionHead(doc, 'asg-states', { title: 'وضعیت‌های تکلیف', lead: 'هر وضعیت با رنگ و برچسب مشخص نمایش داده می‌شود.' }),
        grid(
          doc,
          'asg-states-grid',
          [
            statusCard('new', 'تکلیف جدید', 'مهلت ارسال فعال است و هنوز فایلی بارگذاری نشده است.', 'جدید'),
            statusCard('review', 'در انتظار بررسی', 'فایل ارسال شده و منتظر بازخورد مدرس است.', 'در انتظار بررسی'),
            statusCard('approved', 'تأیید شده', 'مدرس تکلیف را تأیید کرده است.', 'تأیید شده'),
            statusCard('revision', 'نیاز به بازنگری', 'مدرس اصلاحات مشخصی درخواست کرده است.', 'نیاز به بازنگری'),
          ],
          { cols: 2, tablet: 2, mobile: 1, title: 'وضعیت‌ها', cls: 'az-grid az-grid--2' }
        ),
        container(
          doc,
          'asg-upload',
          [
            heading(doc, 'asg-upload-title', 'ارسال تکلیف جدید', { level: 'h2', title: 'H2 — ارسال تکلیف' }),
            paragraph(doc, 'asg-upload-note', 'ارسال فایل توسط LearnDash انجام می‌شود؛ این کارت رابط کاربری همان فرآیند است و در صورت نیاز به فیلد سفارشی، باید توسط هوک مربوط توسعه داده شود.', { size: 13, color: C.muted }),
            container(doc, 'asg-upload-mount', [shortcodeWidget(doc, 'asg-upload-sc', sc('az_assignment_upload'), { title: 'فرم ارسال تکلیف' })], { title: 'فرم ارسال', cls: 'az-mount', g: 0 }),
          ],
          { title: 'بخش — ارسال', cls: 'az-card az-stack', g: 12 }
        ),
      ],
    }),
  ];
}

/* ========================================================= CERTIFICATES */
function certificatesBuild(doc) {
  return [
    dashboardShell(doc, 'cert', {
      active: 'certificates',
      nav: NAV.student,
      title: 'گواهی‌های من',
      lead: 'گواهی‌های صادرشده برای دوره‌های تکمیل‌شده.',
      navTitle: 'Certificates — پنل',
      children: [
        container(doc, 'cert-mount', [shortcodeWidget(doc, 'cert-mount-sc', sc('az_my_certificates'), { title: 'گواهی‌ها (داینامیک)' })], { title: 'گواهی‌ها', cls: 'az-mount', g: 0 }),
        container(doc, 'cert-empty', [emptyState(doc, 'cert-empty-state', STATES.emptyCertificates, { navTitle: 'وضعیت خالی — گواهی‌ها' })], { title: 'وضعیت خالی', cls: 'az-empty-slot', g: 0, customCss: `selector{ display:none; }` }),
        sectionHead(doc, 'cert-sample', { title: 'نمایش گواهی', lead: 'هر گواهی شامل نام دوره، تاریخ صدور و شناسهٔ استعلام است.' }),
        grid(
          doc,
          'cert-sample-grid',
          [0, 1].map((i) =>
            container(
              doc,
              `cert-s-${i}`,
              [
                container(doc, `cert-s-frame-${i}`, [mediaFrame(doc, `cert-s-img-${i}`, { label: 'نمونهٔ گواهی', note: 'جای تصویر', ratio: '4 / 3', title: 'قاب گواهی' })], { title: 'تصویر گواهی', cls: 'az-cert-media', g: 0 }),
                metaRow(doc, `cert-s-${i}`, ['REPLACE: نام دوره', 'REPLACE: تاریخ صدور'], { title: 'متای گواهی' }),
                paragraph(doc, `cert-s-id-${i}`, 'شناسه: REPLACE: AZ-XXXXXX', { size: 13, color: C.muted }),
                container(doc, `cert-s-act-${i}`, [button(doc, `cert-s-view-${i}`, UI.viewCertificate, '#', { variant: 'primary', block: true, size: 'sm', title: 'CTA — مشاهدهٔ گواهی' }), button(doc, `cert-s-dl-${i}`, UI.downloadCertificate, '#', { variant: 'ghost', block: true, size: 'sm', title: 'CTA — دانلود گواهی' })], { title: 'اقدام‌ها', cls: 'az-row', direction: 'row', wrap: 'wrap', g: 8, responsive: { mobile: { flex_direction: 'column' } } }),
              ],
              { title: `کارت گواهی ${i + 1}`, cls: 'az-card az-stack', g: 10 }
            )
          ),
          { cols: 2, tablet: 2, mobile: 1, title: 'نمونه گواهی‌ها', cls: 'az-grid az-grid--2' }
        ),
        faqBlock(doc, 'cert-faq', FAQ.certificates, { title: 'دربارهٔ گواهی‌ها', navTitle: 'Certificates — پرسش‌ها' }),
      ],
    }),
  ];
}

function certificateSingleBuild(doc) {
  return [
    section(
      doc,
      'cs-hero',
      [
        breadcrumbs(doc, 'cs', [{ label: 'خانه', url: '/' }, { label: 'داشبورد', url: '/dashboard' }, { label: 'گواهی‌ها', url: '/dashboard/certificates' }, { label: 'گواهی', url: '#' }]),
        container(
          doc,
          'cs-frame',
          [
            kicker(doc, 'cs-kicker', 'گواهی پایان‌دوره'),
            container(doc, 'cs-mount', [shortcodeWidget(doc, 'cs-mount-sc', sc('az_certificate_detail'), { title: 'جزئیات گواهی (داینامیک)' })], { title: 'جزئیات گواهی', cls: 'az-mount', g: 0 }),
            heading(doc, 'cs-title', 'REPLACE: نام دوره', { level: 'h1', title: 'H1 — نام دوره' }),
            metaRow(doc, 'cs', ['REPLACE: نام هنرجو', 'REPLACE: تاریخ صدور', 'REPLACE: شناسه'], { title: 'متادادهٔ گواهی' }),
          ],
          { title: 'قاب گواهی', cls: 'az-cert az-stack', g: 14 }
        ),
      ],
      { title: 'Certificate — Hero', cls: 'az-section', innerCls: 'az-wrap az-narrow', bg: C.surface }
    ),
    section(
      doc,
      'cs-body',
      [
        grid(
          doc,
          'cs-grid',
          [
            container(
              doc,
              'cs-info',
              [
                heading(doc, 'cs-info-title', 'اطلاعات گواهی', { level: 'h2', title: 'H2 — اطلاعات گواهی' }),
                htmlBlock(
                  doc,
                  'cs-info-table',
                  `<div class="az-table-wrap" dir="rtl"><table><tbody>
<tr><th scope="row">دارنده</th><td>REPLACE: نام هنرجو</td></tr>
<tr><th scope="row">دوره</th><td>REPLACE: نام دوره</td></tr>
<tr><th scope="row">تاریخ صدور</th><td>REPLACE: تاریخ</td></tr>
<tr><th scope="row">شناسهٔ گواهی</th><td dir="ltr">REPLACE: AZ-XXXXXX</td></tr>
<tr><th scope="row">وضعیت</th><td><span class="az-badge az-badge--success">معتبر</span></td></tr>
</tbody></table></div>`,
                  { title: 'جدول اطلاعات', cls: 'az-table-block' }
                ),
              ],
              { title: 'ستون — اطلاعات', cls: 'az-stack', g: 12 }
            ),
            container(
              doc,
              'cs-actions',
              [
                heading(doc, 'cs-act-title', 'اقدام‌ها', { level: 'h2', title: 'H2 — اقدام‌ها' }),
                button(doc, 'cs-dl', UI.downloadCertificate, '#', { variant: 'primary', block: true, title: 'CTA — دانلود' }),
                button(doc, 'cs-verify', 'استعلام عمومی', '/verify', { variant: 'outline', block: true, title: 'CTA — استعلام' }),
                button(doc, 'cs-back', 'بازگشت به گواهی‌ها', '/dashboard/certificates', { variant: 'ghost', block: true, title: 'CTA — بازگشت' }),
                paragraph(doc, 'cs-note', 'خروجی PDF در صورت فعال‌بودن تنظیمات مربوط در افزونهٔ گواهی ارائه می‌شود.', { size: 13, color: C.muted, cls: 'az-form-note' }),
              ],
              { title: 'ستون — اقدام‌ها', cls: 'az-card az-stack', g: 10 }
            ),
          ],
          { cols: 2, tablet: 2, mobile: 1, title: 'اطلاعات و اقدام‌ها', cls: 'az-grid az-grid--2' }
        ),
      ],
      { title: 'Certificate — بدنه', cls: 'az-section az-section--tight', innerCls: 'az-wrap' }
    ),
  ];
}

/* =============================================================== ORDERS */
function ordersBuild(doc) {
  return [
    dashboardShell(doc, 'ord', {
      active: 'orders',
      nav: NAV.student,
      title: 'سفارش‌های من',
      lead: 'وضعیت پرداخت، فاکتور و دسترسی‌های مرتبط با هر سفارش.',
      navTitle: 'Orders — پنل',
      children: [
        container(doc, 'ord-mount', [shortcodeWidget(doc, 'ord-mount-sc', sc('az_my_orders', { limit: 20 }), { title: 'سفارش‌ها (داینامیک)' })], { title: 'سفارش‌ها', cls: 'az-mount', g: 0 }),
        container(doc, 'ord-empty', [emptyState(doc, 'ord-empty-state', STATES.emptyOrders, { navTitle: 'وضعیت خالی — سفارش‌ها' })], { title: 'وضعیت خالی', cls: 'az-empty-slot', g: 0, customCss: `selector{ display:none; }` }),
        container(
          doc,
          'ord-sample',
          [
            sectionHead(doc, 'ord-sample', { title: 'نمایش وضعیت سفارش', lead: 'هر ردیف شامل شماره، تاریخ، مبلغ و وضعیت است.' }),
            htmlBlock(
              doc,
              'ord-table',
              `<div class="az-table-wrap" dir="rtl"><table>
<thead><tr><th scope="col">سفارش</th><th scope="col">تاریخ</th><th scope="col">مبلغ</th><th scope="col">وضعیت</th><th scope="col">اقدام</th></tr></thead>
<tbody>
<tr><th scope="row">REPLACE: #1001</th><td>REPLACE: تاریخ</td><td>REPLACE: مبلغ</td><td><span class="az-badge az-badge--success">تکمیل شده</span></td><td><a href="#">جزئیات</a></td></tr>
<tr><th scope="row">REPLACE: #1002</th><td>REPLACE: تاریخ</td><td>REPLACE: مبلغ</td><td><span class="az-badge az-badge--warn">در انتظار پرداخت</span></td><td><a href="#">پرداخت</a></td></tr>
<tr><th scope="row">REPLACE: #1003</th><td>REPLACE: تاریخ</td><td>REPLACE: مبلغ</td><td><span class="az-badge az-badge--danger">لغو شده</span></td><td><a href="#">جزئیات</a></td></tr>
</tbody></table></div>`,
              { title: 'جدول سفارش‌ها', cls: 'az-table-block' }
            ),
          ],
          { title: 'بخش — نمونه جدول', cls: 'az-stack', g: 12 }
        ),
      ],
    }),
  ];
}

function orderDetailBuild(doc) {
  return [
    section(
      doc,
      'od-hero',
      [
        breadcrumbs(doc, 'od', [{ label: 'خانه', url: '/' }, { label: 'داشبورد', url: '/dashboard' }, { label: 'سفارش‌ها', url: '/dashboard/orders' }, { label: 'جزئیات سفارش', url: '#' }]),
        container(
          doc,
          'od-head',
          [
            heading(doc, 'od-title', 'جزئیات سفارش', { level: 'h1', title: 'H1 — جزئیات سفارش' }),
            metaRow(doc, 'od', ['REPLACE: شمارهٔ سفارش', 'REPLACE: تاریخ', 'REPLACE: وضعیت'], { title: 'متادادهٔ سفارش' }),
          ],
          { title: 'سربرگ سفارش', cls: 'az-stack', g: 12 }
        ),
      ],
      { title: 'Order Detail — سربرگ', cls: 'az-section az-section--tight', innerCls: 'az-wrap', bg: C.surface }
    ),
    section(
      doc,
      'od-body',
      [
        container(doc, 'od-mount', [shortcodeWidget(doc, 'od-mount-sc', sc('az_order_detail'), { title: 'جزئیات سفارش (داینامیک)' })], { title: 'جزئیات سفارش', cls: 'az-mount', g: 0 }),
        grid(
          doc,
          'od-grid',
          [
            container(
              doc,
              'od-items',
              [
                heading(doc, 'od-items-title', 'اقلام سفارش', { level: 'h2', title: 'H2 — اقلام سفارش' }),
                htmlBlock(
                  doc,
                  'od-items-table',
                  `<div class="az-table-wrap" dir="rtl"><table>
<thead><tr><th scope="col">مورد</th><th scope="col">تعداد</th><th scope="col">مبلغ</th></tr></thead>
<tbody>
<tr><th scope="row">REPLACE: نام دوره یا کلاس</th><td>1</td><td>REPLACE: مبلغ</td></tr>
<tr><th scope="row">REPLACE: مورد دوم</th><td>1</td><td>REPLACE: مبلغ</td></tr>
<tr><th scope="row">جمع کل</th><td></td><td>REPLACE: مبلغ کل</td></tr>
</tbody></table></div>`,
                  { title: 'جدول اقلام', cls: 'az-table-block' }
                ),
              ],
              { title: 'ستون — اقلام', cls: 'az-stack', g: 12 }
            ),
            container(
              doc,
              'od-side',
              [
                container(
                  doc,
                  'od-status',
                  [
                    heading(doc, 'od-status-title', 'وضعیت سفارش', { level: 'h3', title: 'H3 — وضعیت' }),
                    metaRow(doc, 'od-status', ['REPLACE: وضعیت فعلی'], { title: 'وضعیت', badge: true }),
                    paragraph(doc, 'od-status-note', 'به‌روزرسانی وضعیت به‌صورت خودکار از ووکامرس نمایش داده می‌شود.', { size: 13, color: C.muted }),
                  ],
                  { title: 'کارت — وضعیت', cls: 'az-card az-stack', g: 8 }
                ),
                container(
                  doc,
                  'od-access',
                  [
                    heading(doc, 'od-access-title', 'دسترسی‌ها', { level: 'h3', title: 'H3 — دسترسی‌ها' }),
                    iconList(doc, 'od-access-list', ['دسترسی به دوره فعال شد', 'فاکتور قابل دانلود است'], { title: 'دسترسی‌ها', size: 13 }),
                    button(doc, 'od-access-btn', 'رفتن به دوره', '/dashboard/courses', { variant: 'primary', block: true, title: 'CTA — رفتن به دوره' }),
                  ],
                  { title: 'کارت — دسترسی‌ها', cls: 'az-card az-stack', g: 8 }
                ),
              ],
              { title: 'ستون کناری', cls: 'az-stack', g: 14 }
            ),
          ],
          { cols: 2, tablet: 2, mobile: 1, title: 'جزئیات', cls: 'az-grid az-grid--2' }
        ),
      ],
      { title: 'Order Detail — بدنه', cls: 'az-section', innerCls: 'az-wrap' }
    ),
  ];
}

/* ============================================================== PROFILE */
function profileBuild(doc) {
  return [
    dashboardShell(doc, 'prof', {
      active: 'profile',
      nav: NAV.student,
      title: 'پروفایل',
      lead: 'اطلاعات حساب و ترجیح‌های ارتباطی شما.',
      navTitle: 'Profile — پنل',
      children: [
        container(
          doc,
          'prof-card',
          [
            heading(doc, 'prof-title', 'اطلاعات حساب', { level: 'h2', title: 'H2 — اطلاعات حساب' }),
            container(doc, 'prof-mount', [shortcodeWidget(doc, 'prof-mount-sc', sc('az_profile_form'), { title: 'فرم پروفایل' })], { title: 'فرم پروفایل', cls: 'az-mount az-form', g: 0 }),
            container(
              doc,
              'prof-sample',
              [
                contactForm(doc, 'prof-form', {
                  fields: [
                    { id: 'display_name', label: 'نام نمایشی', placeholder: 'نام کامل', width: '50' },
                    { id: 'phone', label: 'شماره تماس', type: 'tel', placeholder: '09xxxxxxxxx', width: '50', required: 'true' },
                    { id: 'email', label: 'ایمیل', type: 'email', placeholder: 'name@example.com', width: '50' },
                    { id: 'city', label: 'شهر', width: '50' },
                  ],
                  button: 'ذخیرهٔ تغییرات',
                  title: 'فرم ویرایش پروفایل',
                }),
              ],
              { title: 'نمونهٔ فرم', cls: 'az-mount', g: 0 }
            ),
          ],
          { title: 'کارت پروفایل', cls: 'az-stack', g: 14 }
        ),
        container(
          doc,
          'prof-side',
          [
            container(
              doc,
              'prof-avatar',
              [
                heading(doc, 'prof-avatar-title', 'تصویر حساب', { level: 'h3', title: 'H3 — تصویر حساب' }),
                container(doc, 'prof-avatar-frame', [mediaFrame(doc, 'prof-avatar-img', { label: 'تصویر', note: 'جای تصویر', ratio: '1 / 1', title: 'قاب تصویر حساب' })], { title: 'قاب تصویر', cls: 'az-avatar-frame', g: 0 }),
              ],
              { title: 'کارت — تصویر', cls: 'az-card az-stack', g: 10 }
            ),
            container(
              doc,
              'prof-security',
              [
                heading(doc, 'prof-sec-title', 'امنیت حساب', { level: 'h3', title: 'H3 — امنیت' }),
                paragraph(doc, 'prof-sec-text', 'تغییر شمارهٔ تماس، رمز و نشست‌های فعال از بخش امنیت انجام می‌شود.', { size: 14, color: C.muted }),
                button(doc, 'prof-sec-btn', 'رفتن به امنیت حساب', '/dashboard/security', { variant: 'outline', block: true, size: 'sm', title: 'CTA — امنیت حساب' }),
              ],
              { title: 'کارت — امنیت', cls: 'az-card az-stack', g: 10 }
            ),
          ],
          { title: 'ستون کناری', cls: 'az-stack', g: 14 }
        ),
      ],
    }),
  ];
}

function securityBuild(doc) {
  return [
    dashboardShell(doc, 'sec', {
      active: 'security',
      nav: NAV.student,
      title: 'امنیت حساب',
      lead: 'شمارهٔ تماس، رمز عبور و نشست‌های فعال.',
      navTitle: 'Security — پنل',
      children: [
        grid(
          doc,
          'sec-grid',
          [
            container(
              doc,
              'sec-phone',
              [
                heading(doc, 'sec-phone-title', 'شمارهٔ تماس', { level: 'h3', title: 'H3 — شمارهٔ تماس' }),
                paragraph(doc, 'sec-phone-text', 'ورود به حساب با شمارهٔ تماس و رمز یک‌بارمصرف انجام می‌شود. تغییر شماره از این بخش پیگیری می‌شود.', { size: 14.5, color: C.muted }),
                button(doc, 'sec-phone-btn', 'تغییر شمارهٔ تماس', '#', { variant: 'outline', block: true, size: 'sm', title: 'CTA — تغییر شماره' }),
              ],
              { title: 'کارت — شمارهٔ تماس', cls: 'az-card az-stack', g: 10 }
            ),
            container(
              doc,
              'sec-pass',
              [
                heading(doc, 'sec-pass-title', 'رمز عبور', { level: 'h3', title: 'H3 — رمز عبور' }),
                paragraph(doc, 'sec-pass-text', 'در صورت استفاده از ورود با رمز یک‌بارمصرف، تنظیم رمز عبور اختیاری است.', { size: 14.5, color: C.muted }),
                button(doc, 'sec-pass-btn', 'تغییر رمز عبور', '#', { variant: 'outline', block: true, size: 'sm', title: 'CTA — تغییر رمز' }),
              ],
              { title: 'کارت — رمز عبور', cls: 'az-card az-stack', g: 10 }
            ),
          ],
          { cols: 2, tablet: 2, mobile: 1, title: 'تنظیمات امنیتی', cls: 'az-grid az-grid--2' }
        ),
        container(
          doc,
          'sec-sessions',
          [
            heading(doc, 'sec-sessions-title', 'نشست‌های فعال', { level: 'h2', title: 'H2 — نشست‌های فعال' }),
            container(doc, 'sec-sessions-mount', [shortcodeWidget(doc, 'sec-sessions-sc', sc('az_security_sessions'), { title: 'نشست‌های فعال' })], { title: 'نشست‌ها (داینامیک)', cls: 'az-mount', g: 0 }),
            paragraph(doc, 'sec-sessions-note', 'نمایش نشست‌های فعال نیازمند افزونه یا کد سفارشی است؛ بدون آن این بخش خالی می‌ماند و باید حذف شود.', { size: 13, color: C.muted, cls: 'az-form-note' }),
          ],
          { title: 'بخش — نشست‌ها', cls: 'az-stack', g: 12 }
        ),
        container(
          doc,
          'sec-tips',
          [
            heading(doc, 'sec-tips-title', 'توصیه‌های امنیتی', { level: 'h2', title: 'H2 — توصیه‌ها' }),
            iconList(doc, 'sec-tips-list', ['رمز یک‌بارمصرف را با کسی در میان نگذارید.', 'پس از پایان کار روی دستگاه مشترک، خارج شوید.', 'در صورت دریافت کد ناخواسته، رمز را تغییر دهید.'], { title: 'توصیه‌ها' }),
          ],
          { title: 'بخش — توصیه‌ها', cls: 'az-card az-card--cream az-stack', g: 10 }
        ),
      ],
    }),
  ];
}

/* ------------------------------------------------------------- registry */
export function registerDashboard() {
  define({ slug: 'dashboard', title: 'داشبورد هنرجو', docType: 'page', group: 'Student', page: '/dashboard', plugins: ['learndash-lms', 'woocommerce', 'kit-php'], dynamic: 'az_dashboard_stats / az_continue_learning / az_my_courses', url: '/dashboard', condition: '', manual: 'دسترسی این صفحه باید به کاربران واردشده محدود شود.', status: 'NEEDS CUSTOM BACKEND' }, dashboardBuild);
  define({ slug: 'my-courses', title: 'دوره‌های من', docType: 'page', group: 'Student', page: '/dashboard/courses', plugins: ['learndash-lms', 'kit-php'], dynamic: 'az_my_courses', url: '/dashboard/courses', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, myCoursesBuild);
  define({ slug: 'my-classes', title: 'کلاس‌های حضوری من', docType: 'page', group: 'Student', page: '/dashboard/classes', plugins: ['woocommerce', 'kit-php'], dynamic: 'az_my_workshops', url: '/dashboard/classes', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, myClassesBuild);
  define({ slug: 'assignments', title: 'تکالیف', docType: 'page', group: 'Student', page: '/dashboard/assignments', plugins: ['learndash-lms', 'kit-php'], dynamic: 'az_assignments', url: '/dashboard/assignments', condition: '', manual: 'ارسال فایل باید با تنظیمات تکلیف LearnDash هماهنگ شود.', status: 'NEEDS CUSTOM BACKEND' }, assignmentsBuild);
  define({ slug: 'certificates', title: 'گواهی‌های من', docType: 'page', group: 'Student', page: '/dashboard/certificates', plugins: ['learndash-lms', 'kit-php'], dynamic: 'az_my_certificates', url: '/dashboard/certificates', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, certificatesBuild);
  define({ slug: 'certificate-single', title: 'جزئیات گواهی', docType: 'page', group: 'Student', page: '/dashboard/certificates/{id}', plugins: ['kit-php'], dynamic: 'az_certificate_detail', url: '/dashboard/certificates/{id}', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, certificateSingleBuild);
  define({ slug: 'orders', title: 'سفارش‌های من', docType: 'page', group: 'Student', page: '/dashboard/orders', plugins: ['woocommerce', 'kit-php'], dynamic: 'az_my_orders', url: '/dashboard/orders', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, ordersBuild);
  define({ slug: 'order-detail', title: 'جزئیات سفارش', docType: 'page', group: 'Student', page: '/dashboard/orders/{id}', plugins: ['woocommerce', 'kit-php'], dynamic: 'az_order_detail', url: '/dashboard/orders/{id}', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, orderDetailBuild);
  define({ slug: 'profile', title: 'پروفایل', docType: 'page', group: 'Student', page: '/dashboard/profile', plugins: ['elementor-pro', 'kit-php'], dynamic: 'az_profile_form', url: '/dashboard/profile', condition: '', manual: '', status: 'NEEDS CUSTOM BACKEND' }, profileBuild);
  define({ slug: 'account-security', title: 'امنیت حساب', docType: 'page', group: 'Student', page: '/dashboard/security', plugins: ['digits', 'kit-php'], dynamic: 'تغییر شماره و رمز از طریق Digits', url: '/dashboard/security', condition: '', manual: 'فرم‌های تغییر شماره/رمز با shortcode واقعی Digits جایگزین شود.', status: 'NEEDS CUSTOM BACKEND' }, securityBuild);
}
