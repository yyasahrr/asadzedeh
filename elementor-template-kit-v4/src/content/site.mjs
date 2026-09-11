/**
 * Site-wide Persian content bank.
 *
 * CONTENT RULES (spec §41):
 *  - no invented statistics, no fake awards, no fake testimonials with real-sounding names
 *  - every field that must come from the customer is written as `REPLACE:` so the
 *    validator can count them and the Template Map can mark the page
 *    READY — NEEDS REAL CONTENT
 *  - legal/financial statements are marked DRAFT and need review
 */

export const BRAND = {
  name: 'آکادمی اسدزاده',
  short: 'اسدزاده',
  tagline: 'کارگاه آموزش فرش، گلیم و هنرهای بافندگی',
  url: '/',
  since: 'REPLACE: سال تأسیس',
};

export const CONTACT = {
  phone: 'REPLACE: ۰۲۱-xxxxxxxx',
  phoneHref: '#REPLACE-PHONE',
  mobile: 'REPLACE: ۰۹xxxxxxxxx',
  email: 'REPLACE: info@asadzadehacademy.ir',
  address: 'REPLACE: استان، شهر، خیابان، پلاک، واحد',
  addressShort: 'REPLACE: شهر — خیابان',
  hoursWeek: 'شنبه تا چهارشنبه — REPLACE: ساعت',
  hoursThu: 'پنجشنبه — REPLACE: ساعت',
  hoursFri: 'جمعه — تعطیل',
  response: 'پاسخ‌گویی در ساعات کاری، معمولاً طی یک روز کاری پس از ثبت پیام.',
  mapNote: 'کلید API نقشه نشان را در تنظیمات ویجت وارد کنید.',
};

export const NAV = {
  primary: [
    { label: 'خانه', url: '/' },
    { label: 'از کجا شروع کنم؟', url: '/start-here' },
    { label: 'دوره‌های آنلاین', url: '/courses' },
    { label: 'مسیرهای یادگیری', url: '/learning-paths' },
    { label: 'کلاس‌های حضوری', url: '/workshops' },
    { label: 'مدرسان', url: '/instructors' },
    { label: 'آثار هنرجویان', url: '/works' },
    { label: 'مجله', url: '/blog' },
    { label: 'فروشگاه', url: '/shop' },
    { label: 'تماس با ما', url: '/contact' },
  ],
  student: [
    { label: 'داشبورد', url: '/dashboard' },
    { label: 'دوره‌های من', url: '/dashboard/courses' },
    { label: 'کلاس‌های من', url: '/dashboard/classes' },
    { label: 'تکالیف', url: '/dashboard/assignments' },
    { label: 'گواهی‌ها', url: '/dashboard/certificates' },
    { label: 'سفارش‌ها', url: '/dashboard/orders' },
    { label: 'پروفایل', url: '/dashboard/profile' },
    { label: 'امنیت حساب', url: '/dashboard/security' },
    { label: 'پشتیبانی', url: '/support' },
  ],
  account: [
    { label: 'ورود / ثبت‌نام', url: '/auth' },
    { label: 'داشبورد', url: '/dashboard' },
  ],
  footer: [
    {
      title: 'آموزش',
      links: [
        { label: 'دوره‌های آنلاین', url: '/courses' },
        { label: 'مسیرهای یادگیری', url: '/learning-paths' },
        { label: 'کلاس‌های حضوری', url: '/workshops' },
        { label: 'از کجا شروع کنم؟', url: '/start-here' },
      ],
    },
    {
      title: 'کارگاه',
      links: [
        { label: 'دربارهٔ کارگاه', url: '/about' },
        { label: 'مدرسان', url: '/instructors' },
        { label: 'آثار هنرجویان', url: '/works' },
        { label: 'مجله', url: '/blog' },
      ],
    },
    {
      title: 'پشتیبانی',
      links: [
        { label: 'پرسش‌های پرتکرار', url: '/faq' },
        { label: 'تماس با ما', url: '/contact' },
        { label: 'استعلام گواهی', url: '/verify' },
        { label: 'قوانین و مقررات', url: '/rules' },
      ],
    },
  ],
};

export const TRUST = {
  note: 'آمار و افتخارات تنها پس از تأیید شما نمایش داده می‌شود؛ این بلوک عمداً بدون عدد است.',
  items: [
    'آموزش پروژه‌محور با بازخورد مرحله‌به‌مرحله روی اثر واقعی هنرجو',
    'کلاس‌های حضوری با ابزار و دار قالی در کارگاه',
    'پشتیبانی آموزشی در طول دوره، نه فقط زمان برگزاری',
    'امکان دریافت گواهی پایان‌دوره برای دوره‌های تکمیل‌شده',
  ],
};

/* URLs are placeholders on purpose: shipping real external links inside a
   template JSON is both fragile and a tracking/privacy risk. */
export const SOCIAL = {
  instagram: { label: 'اینستاگرام', url: '#REPLACE-INSTAGRAM' },
  telegram: { label: 'تلگرام', url: '#REPLACE-TELEGRAM' },
  aparat: { label: 'آپارات', url: '#REPLACE-APARAT' },
};

export const SEO_NOTES = {
  org: 'ساختار Organization و Course در افزونهٔ سئو تنظیم شود؛ هیچ مقدار ساختگی در JSON خروجی نیست.',
  breadcrumb: 'الگوی breadcrumb در همهٔ صفحات یکسان است و با افزونهٔ سئو همگام می‌شود.',
};

export const REPLACE_MARK = 'REPLACE:';
