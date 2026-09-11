/**
 * Course / path / workshop / instructor / artwork content.
 *
 * IMPORTANT (spec §41 + user decision "meaningful_flagged"):
 *  - subject matter, structure and hierarchy are REAL and specific to Iranian
 *    craft education (this is what makes pages look designed, not generic)
 *  - anything unverifiable (exact price, exact dates, real people's names,
 *    seat counts) is a REPLACE marker and is reported in the Template Map
 *  - no fake statistics anywhere
 */

export const LEVELS = ['مقدماتی', 'متوسط', 'پیشرفته'];

export const COURSES = [
  {
    slug: 'carpet-weaving-basics',
    title: 'فرش‌بافی مقدماتی — از دار تا گره',
    level: 'مقدماتی',
    duration: 'REPLACE: ۱۲ جلسه',
    sessions: 'REPLACE: ۱۲',
    totalHours: 'REPLACE: ۲۴ ساعت',
    category: 'فرش‌بافی',
    excerpt: 'نصب دار، شناخت مواد، گره‌زنی ترکی و فارسی و بافت اولین قطعهٔ تمرینی با نقشهٔ ساده.',
    outcomes: [
      'راه‌اندازی دار و تنظیم چله‌کشی به‌صورت اصولی',
      'اجرای گرهٔ فارسی و ترکی با تراکم یکنواخت',
      'خواندن نقشهٔ ساده و انتقال آن روی چله',
      'تحویل یک قطعهٔ تمرینی کامل در پایان دوره',
    ],
    prerequisites: 'نیاز به تجربهٔ قبلی نیست؛ ابزار اولیه معرفی می‌شود.',
  },
  {
    slug: 'carpet-weaving-intermediate',
    title: 'فرش‌بافی متوسط — نقشه‌خوانی و تراکم',
    level: 'متوسط',
    duration: 'REPLACE: ۱۶ جلسه',
    sessions: 'REPLACE: ۱۶',
    totalHours: 'REPLACE: ۳۲ ساعت',
    category: 'فرش‌بافی',
    excerpt: 'افزایش تراکم، کنترل یکنواختی بافت، اجرای نقشه‌های لچک‌وترنج و اصلاح خطاهای رایج.',
    outcomes: [
      'اجرای نقشه‌های گردان و قرینه با حفظ تقارن',
      'مدیریت تراکم و رج‌شماری در طول کار',
      'رفع خطاهای رایج پودکشی و لبه‌بندی',
      'آمادگی برای اجرای یک قطعهٔ مستقل',
    ],
    prerequisites: 'گذراندن سطح مقدماتی یا تسلط بر گرهٔ فارسی.',
  },
  {
    slug: 'kelim-weaving',
    title: 'گلیم‌بافی — از بافت ساده تا نقشه‌های هندسی',
    level: 'مقدماتی',
    duration: 'REPLACE: ۱۰ جلسه',
    sessions: 'REPLACE: ۱۰',
    totalHours: 'REPLACE: ۲۰ ساعت',
    category: 'گلیم‌بافی',
    excerpt: 'آشنایی با بافت‌های سوماک، چرت‌بافی و گلیم یک‌رو، و اجرای نقوش هندسی با ریتم منظم.',
    outcomes: [
      'تسلط بر بافت پایهٔ گلیم و کنترل لبه‌ها',
      'اجرای نقوش هندسی با رعایت ریتم و تکرار',
      'ترکیب رنگ بر پایهٔ رنگرزی سنتی',
      'تحویل یک قطعهٔ گلیم با نقشهٔ انتخابی',
    ],
    prerequisites: 'بدون پیش‌نیاز؛ مناسب شروع مسیر گلیم‌بافی.',
  },
  {
    slug: 'carpet-design',
    title: 'طراحی نقشهٔ فرش — از ایده تا شابلون',
    level: 'متوسط',
    duration: 'REPLACE: ۱۴ جلسه',
    sessions: 'REPLACE: ۱۴',
    totalHours: 'REPLACE: ۲۸ ساعت',
    category: 'طراحی نقشه',
    excerpt: 'ترسیم نقوش سنتی، انتقال به مقیاس اجرا، رنگ‌آمیزی و آماده‌سازی نقشه برای بافت.',
    outcomes: [
      'ترسیم نقوش پایه و ایجاد تکرار اصولی',
      'انتقال طرح به مقیاس و تبدیل به نقشهٔ خانه‌شمار',
      'انتخاب پالت رنگی متناسب با رنگرزی سنتی',
      'خروجی آمادهٔ تحویل به بافنده',
    ],
    prerequisites: 'آشنایی اولیه با فرش یا طراحی؛ ابزار ترسیم معرفی می‌شود.',
  },
  {
    slug: 'natural-dyeing',
    title: 'رنگرزی سنتی — رنگ از گیاه',
    level: 'مقدماتی',
    duration: 'REPLACE: ۸ جلسه',
    sessions: 'REPLACE: ۸',
    totalHours: 'REPLACE: ۱۶ ساعت',
    category: 'رنگرزی',
    excerpt: 'استخراج رنگ از منابع گیاهی، دندانه‌کاری، تثبیت رنگ و ساخت پالت شخصی.',
    outcomes: [
      'شناخت منابع گیاهی رنگی و فصل برداشت',
      'دندانه‌کاری و تثبیت رنگ روی الیاف طبیعی',
      'تکرارپذیری رنگ و ثبت فرمول شخصی',
      'ساخت پالت هماهنگ برای یک طرح',
    ],
    prerequisites: 'بدون پیش‌نیاز؛ رعایت نکات ایمنی کارگاه الزامی است.',
  },
  {
    slug: 'restoration',
    title: 'مرمت و رفو — احیای فرش‌های آسیب‌دیده',
    level: 'پیشرفته',
    duration: 'REPLACE: ۱۸ جلسه',
    sessions: 'REPLACE: ۱۸',
    totalHours: 'REPLACE: ۳۶ ساعت',
    category: 'مرمت',
    excerpt: 'آسیب‌شناسی، زیرسازی، رفوی گره‌ای، ترمیم لبه‌ها و بازگرداندن یکپارچگی بافت.',
    outcomes: [
      'تشخیص نوع آسیب و انتخاب روش مرمت',
      'اجرای رفوی گره‌ای هماهنگ با بافت اصلی',
      'ترمیم شیرازه و لبه بدون تغییر فرم',
      'مستندسازی مرمت برای تحویل به مشتری',
    ],
    prerequisites: 'تسلط بر بافت و تجربهٔ کار عملی روی دار.',
  },
];

export const PATHS = [
  {
    slug: 'start-carpet-weaving',
    title: 'شروع فرش‌بافی',
    summary: 'از نصب دار و اولین گره تا اجرای یک قطعهٔ کامل، بدون نیاز به تجربهٔ قبلی.',
    stages: 'REPLACE: ۳ مرحله',
    courseCount: 'REPLACE: ۳ دوره',
    totalDuration: 'REPLACE: ۴ ماه',
    accent: 'navy',
    courses: ['carpet-weaving-basics', 'carpet-weaving-intermediate', 'carpet-design'],
    outcomes: [
      'تسلط عملی بر بافت و یکنواختی رج‌ها',
      'توانایی خواندن و اجرای نقشه',
      'تکمیل یک قطعهٔ شخصی با تأیید مدرس',
    ],
  },
  {
    slug: 'start-kelim-weaving',
    title: 'شروع گلیم‌بافی',
    summary: 'یادگیری بافت‌های پایه و رسیدن به اجرای نقوش هندسی با ریتم درست.',
    stages: 'REPLACE: ۲ مرحله',
    courseCount: 'REPLACE: ۲ دوره',
    totalDuration: 'REPLACE: ۳ ماه',
    accent: 'red',
    courses: ['kelim-weaving', 'natural-dyeing'],
    outcomes: ['تسلط بر بافت پایه و کنترل لبه', 'ساخت پالت رنگی شخصی', 'تحویل یک قطعهٔ گلیم'],
  },
  {
    slug: 'carpet-design-path',
    title: 'طراحی نقشه',
    summary: 'از ترسیم نقوش سنتی تا آماده‌سازی نقشهٔ قابل اجرا روی دار.',
    stages: 'REPLACE: ۲ مرحله',
    courseCount: 'REPLACE: ۲ دوره',
    totalDuration: 'REPLACE: ۳ ماه',
    accent: 'teal',
    courses: ['carpet-design', 'natural-dyeing'],
    outcomes: ['ترسیم و تکرار نقوش', 'خروجی نقشهٔ خانه‌شمار', 'پالت رنگی هماهنگ'],
  },
  {
    slug: 'natural-dyeing-path',
    title: 'رنگرزی سنتی',
    summary: 'ساخت پالت رنگی پایدار از منابع گیاهی برای استفاده در پروژه‌های شخصی.',
    stages: 'REPLACE: ۱ مرحله',
    courseCount: 'REPLACE: ۱ دوره',
    totalDuration: 'REPLACE: ۲ ماه',
    accent: 'cream',
    courses: ['natural-dyeing'],
    outcomes: ['استخراج و تثبیت رنگ', 'فرمول شخصی تکرارپذیر', 'پالت آمادهٔ اجرا'],
  },
  {
    slug: 'restoration-path',
    title: 'مرمت و رفو',
    summary: 'مسیر تخصصی برای هنرجویان باتجربه که می‌خواهند وارد کار مرمت حرفه‌ای شوند.',
    stages: 'REPLACE: ۲ مرحله',
    courseCount: 'REPLACE: ۲ دوره',
    totalDuration: 'REPLACE: ۵ ماه',
    accent: 'navy',
    courses: ['carpet-weaving-intermediate', 'restoration'],
    outcomes: ['آسیب‌شناسی دقیق', 'رفوی هماهنگ با بافت', 'مستندسازی حرفه‌ای'],
  },
];

export const WORKSHOPS = [
  {
    slug: 'workshop-kelim-weekend',
    title: 'کارگاه حضوری گلیم‌بافی — آخر هفته',
    instructor: 'مدرس گلیم‌بافی',
    start: 'REPLACE: تاریخ شروع',
    days: 'پنجشنبه‌ها',
    time: 'REPLACE: ساعت',
    sessions: 'REPLACE: ۶ جلسه',
    location: 'کارگاه اسدزاده — REPLACE: آدرس سالن',
    seats: 'REPLACE: ظرفیت باقی‌مانده',
    price: 'REPLACE: قیمت',
    installment: 'REPLACE: شرایط اقساط در صورت پشتیبانی درگاه',
  },
  {
    slug: 'workshop-dyeing-intensive',
    title: 'کارگاه فشردهٔ رنگرزی گیاهی',
    instructor: 'مدرس رنگرزی سنتی',
    start: 'REPLACE: تاریخ شروع',
    days: 'REPLACE: روزها',
    time: 'REPLACE: ساعت',
    sessions: 'REPLACE: ۴ جلسه',
    location: 'کارگاه اسدزاده — REPLACE: آدرس سالن',
    seats: 'REPLACE: ظرفیت باقی‌مانده',
    price: 'REPLACE: قیمت',
    installment: 'REPLACE: شرایط اقساط در صورت پشتیبانی درگاه',
  },
  {
    slug: 'workshop-carpet-knotting',
    title: 'کارگاه گره‌زنی روی دار',
    instructor: 'مدرس فرش‌بافی',
    start: 'REPLACE: تاریخ شروع',
    days: 'REPLACE: روزها',
    time: 'REPLACE: ساعت',
    sessions: 'REPLACE: ۵ جلسه',
    location: 'کارگاه اسدزاده — REPLACE: آدرس سالن',
    seats: 'REPLACE: ظرفیت باقی‌مانده',
    price: 'REPLACE: قیمت',
    installment: 'REPLACE: شرایط اقساط در صورت پشتیبانی درگاه',
  },
];

export const INSTRUCTORS = [
  {
    slug: 'instructor-carpet',
    name: 'REPLACE: نام مدرس فرش‌بافی',
    role: 'مدرس فرش‌بافی',
    specialty: 'فرش‌بافی دستباف و اجرای نقشه‌های کلاسیک',
    experience: 'REPLACE: سال تجربه در صورت تأیید',
    bio: 'REPLACE: بیوگرافی کوتاه — سوابق آموزشی و شغلی مدرس پس از تأیید تکمیل می‌شود.',
    philosophy: 'یادگیری بافت فقط با تکرار و بازخورد روی دار معنا پیدا می‌کند؛ هر هنرجو باید قطعهٔ خودش را ببافد.',
    courses: ['carpet-weaving-basics', 'carpet-weaving-intermediate'],
    workshops: ['workshop-carpet-knotting'],
  },
  {
    slug: 'instructor-kelim',
    name: 'REPLACE: نام مدرس گلیم‌بافی',
    role: 'مدرس گلیم‌بافی',
    specialty: 'گلیم و بافت‌های سوماک و چرت',
    experience: 'REPLACE: سال تجربه در صورت تأیید',
    bio: 'REPLACE: بیوگرافی کوتاه — سوابق آموزشی و شغلی مدرس پس از تأیید تکمیل می‌شود.',
    philosophy: 'ریتم در گلیم از تکرار آگاهانه می‌آید، نه از سرعت دست.',
    courses: ['kelim-weaving'],
    workshops: ['workshop-kelim-weekend'],
  },
  {
    slug: 'instructor-dyeing',
    name: 'REPLACE: نام مدرس رنگرزی',
    role: 'مدرس رنگرزی سنتی',
    specialty: 'رنگرزی گیاهی و تثبیت رنگ روی الیاف طبیعی',
    experience: 'REPLACE: سال تجربه در صورت تأیید',
    bio: 'REPLACE: بیوگرافی کوتاه — سوابق آموزشی و شغلی مدرس پس از تأیید تکمیل می‌شود.',
    philosophy: 'رنگِ گیاهی با صبر و ثبت دقیق فرمول به نتیجهٔ یکسان می‌رسد.',
    courses: ['natural-dyeing'],
    workshops: ['workshop-dyeing-intensive'],
  },
  {
    slug: 'instructor-design',
    name: 'REPLACE: نام مدرس طراحی نقشه',
    role: 'مدرس طراحی نقشه',
    specialty: 'طراحی نقوش سنتی و آماده‌سازی نقشهٔ اجرا',
    experience: 'REPLACE: سال تجربه در صورت تأیید',
    bio: 'REPLACE: بیوگرافی کوتاه — سوابق آموزشی و شغلی مدرس پس از تأیید تکمیل می‌شود.',
    philosophy: 'نقشهٔ خوب آن است که بافنده بتواند بدون پرسش اجرایش کند.',
    courses: ['carpet-design'],
    workshops: [],
  },
];

export const ARTWORKS = [
  { title: 'REPLACE: عنوان اثر', technique: 'فرش‌بافی — گره فارسی', materials: 'پشم و ابریشم', dimensions: 'REPLACE: ابعاد', year: 'REPLACE: سال', story: 'REPLACE: روایت کوتاه اثر و روند ساخت آن.' },
  { title: 'REPLACE: عنوان اثر', technique: 'گلیم — بافت سوماک', materials: 'پشم دست‌ریس', dimensions: 'REPLACE: ابعاد', year: 'REPLACE: سال', story: 'REPLACE: روایت کوتاه اثر و روند ساخت آن.' },
  { title: 'REPLACE: عنوان اثر', technique: 'رنگرزی گیاهی', materials: 'رنگ‌های گیاهی روی پشم', dimensions: 'REPLACE: ابعاد', year: 'REPLACE: سال', story: 'REPLACE: روایت کوتاه اثر و روند ساخت آن.' },
  { title: 'REPLACE: عنوان اثر', technique: 'فرش‌بافی — نقشهٔ شخصی', materials: 'پشم', dimensions: 'REPLACE: ابعاد', year: 'REPLACE: سال', story: 'REPLACE: روایت کوتاه اثر و روند ساخت آن.' },
  { title: 'REPLACE: عنوان اثر', technique: 'گلیم — نقش هندسی', materials: 'پشم و پنبه', dimensions: 'REPLACE: ابعاد', year: 'REPLACE: سال', story: 'REPLACE: روایت کوتاه اثر و روند ساخت آن.' },
  { title: 'REPLACE: عنوان اثر', technique: 'مرمت و رفو', materials: 'REPLACE: مواد', dimensions: 'REPLACE: ابعاد', year: 'REPLACE: سال', story: 'REPLACE: روایت کوتاه اثر و روند ساخت آن.' },
];

/** Testimonials are role-attributed, never fake identities (spec §41). */
export const TESTIMONIALS = [
  { quote: 'REPLACE: متن تأییدیهٔ هنرجو — جمله‌ای دربارهٔ روند آموزش و بازخورد مدرس.', name: 'هنرجوی دورهٔ فرش‌بافی', role: 'REPLACE: دوره/سال' },
  { quote: 'REPLACE: متن تأییدیهٔ هنرجو — جمله‌ای دربارهٔ فضای کارگاه و ابزار در دسترس.', name: 'هنرجوی کلاس حضوری گلیم', role: 'REPLACE: دوره/سال' },
  { quote: 'REPLACE: متن تأییدیهٔ هنرجو — جمله‌ای دربارهٔ پیشرفت از صفر تا قطعهٔ کامل.', name: 'هنرجوی مسیر شروع فرش‌بافی', role: 'REPLACE: دوره/سال' },
];

export const ROADMAP = [
  { title: 'آشنایی و انتخاب مسیر', body: 'گفت‌وگوی کوتاه برای انتخاب بین فرش‌بافی، گلیم‌بافی یا طراحی نقشه بر اساس هدف شما.' },
  { title: 'یادگیری اصول روی دار', body: 'نصب دار، چله‌کشی، گره‌زنی و کنترل یکنواختی با بازخورد مستقیم مدرس.' },
  { title: 'اجرای پروژهٔ اول', body: 'انتخاب نقشهٔ ساده و بافت اولین قطعه با همراهی گام‌به‌گام.' },
  { title: 'تکمیل و ارزیابی', body: 'بررسی نهایی اثر، رفع ایرادها و دریافت بازخورد برای پروژهٔ بعدی.' },
];

export const courseBySlug = (slug) => COURSES.find((c) => c.slug === slug);
export const pathBySlug = (slug) => PATHS.find((p) => p.slug === slug);
