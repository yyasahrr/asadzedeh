/**
 * Shortcode registry — single source for docs/SHORTCODE-MAP.md and for the
 * validator (an undeclared shortcode is a build error, spec §24: never invent
 * shortcode names silently).
 *
 * verified: true  -> documented by its own plugin (safe to ship).
 * verified: false -> MUST be confirmed against the live install; flagged in
 *                    docs/UNRESOLVED-INTEGRATIONS.md until then.
 * source:   'plugin' | 'kit-php' (implemented in backend/asadzadeh-kit-*.php)
 */

export const SHORTCODES = {
  /* ------------------------------------------------ WooCommerce (documented) */
  woocommerce_cart: {
    plugin: 'woocommerce',
    verified: true,
    purpose: 'سبد خرید کامل WooCommerce',
    params: '',
  },
  woocommerce_checkout: {
    plugin: 'woocommerce',
    verified: true,
    purpose: 'فرم تسویه‌حساب WooCommerce',
    params: '',
  },
  woocommerce_my_account: {
    plugin: 'woocommerce',
    verified: true,
    purpose: 'حساب کاربری و endpointهای WooCommerce',
    params: '',
  },
  woocommerce_order_tracking: {
    plugin: 'woocommerce',
    verified: true,
    purpose: 'پیگیری سفارش',
    params: '',
  },
  products: {
    plugin: 'woocommerce',
    verified: true,
    purpose: 'گرید محصولات/دوره‌ها',
    params: 'limit, columns, category, orderby, order, ids, paginate',
  },
  product_categories: {
    plugin: 'woocommerce',
    verified: true,
    purpose: 'فهرست دسته‌های محصول',
    params: 'number, columns, ids',
  },

  /* ------------------------------------------------------ LearnDash LMS */
  ld_course_list: {
    plugin: 'learndash-lms',
    verified: true,
    purpose: 'فهرست دوره‌ها',
    params: 'num, orderby, order, category, tag, mycourses, status, show_thumbnail, progress_bar, col, course_grid, price',
  },
  course_content: {
    plugin: 'learndash-lms',
    verified: true,
    purpose: 'محتوای دوره (۱۰۰٪ در Single Course)',
    params: 'course_id, field',
  },
  learndash_course_progress: {
    plugin: 'learndash-lms',
    verified: true,
    purpose: 'نوار پیشرفت دورهٔ کاربر',
    params: 'course_id, user_id, array',
  },
  ld_profile: {
    plugin: 'learndash-lms',
    verified: true,
    purpose: 'پروفایل و پیشرفت هنرجو',
    params: 'per_page, orderby, order, course_points_user, expand_all, profile_link, show_header, show_quizzes, show_course_info, show_search, show_completed_courses',
  },
  ld_certificate: {
    plugin: 'learndash-lms',
    verified: false,
    purpose: 'لینک گواهی دوره',
    params: 'course_id, user_id, cert_id',
  },
  usercourseinfo: {
    plugin: 'learndash-lms',
    verified: false,
    purpose: 'خلاصه دوره‌های کاربر',
    params: 'course_id, user_id, field',
  },
  ld_lesson_list: {
    plugin: 'learndash-lms',
    verified: false,
    purpose: 'فهرست درس‌های یک دوره',
    params: 'course_id, num, orderby, order',
  },
  ld_topic_list: {
    plugin: 'learndash-lms',
    verified: false,
    purpose: 'فهرست موضوع‌های یک درس',
    params: 'course_id, lesson_id, num',
  },

  /* ----------------------------------------------------------- Digits */
  'dm-page': { plugin: 'digits', verified: false, purpose: 'فرم ورود/ثبت‌نام یکپارچه Digits', params: 'login, signup' },
  'dm-login-page': { plugin: 'digits', verified: false, purpose: 'فرم ورود Digits', params: '' },
  'dm-forgot-password-page': { plugin: 'digits', verified: false, purpose: 'بازیابی رمز Digits', params: '' },
  'dm-signup-page': { plugin: 'digits', verified: false, purpose: 'فرم ثبت‌نام Digits', params: '' },

  /* ------------------------------- shipped with this kit (backend/*.php) --- */
  az_dashboard_stats: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'کاشی‌های آمار واقعی داشبورد (بدون عدد ساختگی)', params: '' },
  az_continue_learning: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'کارت ادامه یادگیری بر اساس آخرین درس باز شده', params: '' },
  az_my_courses: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'دوره‌های من با درصد پیشرفت واقعی', params: 'limit, status' },
  az_my_workshops: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'کلاس‌های حضوری خریداری‌شده', params: '' },
  az_assignments: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'تکالیف با وضعیت واقعی (جدید/ارسال‌شده/تأیید/نیاز به بازنگری)', params: 'course_id' },
  az_my_certificates: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'گواهی‌های صادرشده برای کاربر', params: '' },
  az_certificate_verify: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'فرم عمومی استعلام گواهی با nonce', params: '' },
  az_course_curriculum: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'سرفصل درختی دوره با وضعیت قفل/رایگان/تکمیل', params: 'course_id' },
  az_course_cta: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'دکمهٔ خرید/ادامه بر اساس وضعیت ثبت‌نام واقعی', params: 'course_id' },
  az_course_meta: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'متادادهٔ واقعی دوره (سطح، جلسات، مدت)', params: 'field, course_id' },
  az_workshop_meta: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'ظرفیت/تاریخ/جلسات کلاس حضوری از موجودی محصول', params: 'field, product_id' },
  az_instructor_courses: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'دوره‌های یک مدرس (ACF relationship)', params: 'instructor_id' },
  az_path_courses: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'توالی دوره‌های یک مسیر یادگیری', params: 'path_id' },
  az_related_courses: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'دوره‌های مرتبط بر اساس دسته', params: 'limit' },
  az_order_tracking: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'پیگیری سفارش با nonce', params: '' },
  az_preorder_form: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'فرم پیش‌خرید/لیست انتظار', params: 'product_id' },
  az_no_results: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'پیشنهادهای جایگزین هنگام نبود نتیجهٔ جست‌وجو', params: '' },
  az_my_orders: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'جدول سفارش‌های کاربر با وضعیت واقعی', params: 'limit' },
  az_order_detail: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'جزئیات یک سفارش با بررسی مالکیت', params: 'order_id' },
  az_certificate_detail: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'جزئیات یک گواهی با بررسی مالکیت', params: 'cert_id' },
  az_assignment_upload: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'فرم ارسال تکلیف با nonce و بررسی مجوز', params: 'course_id, lesson_id' },
  az_profile_form: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'فرم ویرایش پروفایل با nonce', params: '' },
  az_security_sessions: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'نشست‌های فعال کاربر (در صورت پشتیبانی)', params: '' },
  az_search_results: { source: 'kit-php', plugin: 'kit', verified: true, purpose: 'نتایج جست‌وجو با وضعیت بدون نتیجه', params: '' },
};

export function shortcodeMeta(name) {
  return SHORTCODES[name] || null;
}

/** `[name a="1"]` builder that also registers usage for the validator. */
export function sc(name, attrs = {}) {
  const parts = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}="${v}"`);
  return parts.length ? `[${name} ${parts.join(' ')}]` : `[${name}]`;
}

export const allShortcodes = SHORTCODES;
