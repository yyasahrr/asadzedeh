import type {
  Certificate,
  Comment,
  CourseProtection,
  Enrollment,
  Order,
  Product,
  Settings,
  ShippingMethod,
  Student,
  User,
} from "./types";

/* ---------------- Seed: students / orders / certificates ----------------
   Used to initialize the file store (data/db.json) on first run. */

export const students: Student[] = [
  { name: "سارا محمدی", phone: "09123456789", courses: 3, joinDate: "تیر ۱۴۰۵", status: "فعال" },
  { name: "حسین احمدی", phone: "09129876543", courses: 2, joinDate: "مرداد ۱۴۰۵", status: "فعال" },
  { name: "نگار رضایی", phone: "09351234567", courses: 2, joinDate: "خرداد ۱۴۰۵", status: "فعال" },
  { name: "لیلا کریمی", phone: "09127654321", courses: 1, joinDate: "شهریور ۱۴۰۵", status: "فعال" },
  { name: "امیر حسینی", phone: "09201112233", courses: 1, joinDate: "مرداد ۱۴۰۵", status: "در انتظار پرداخت" },
  { name: "مریم صادقی", phone: "09193334455", courses: 4, joinDate: "اردیبهشت ۱۴۰۵", status: "فعال" },
];

export const orders: Order[] = [
  { id: "AZ-9041", student: "سارا محمدی", item: "گبه‌بافی (آنلاین)", amount: 1750000, status: "پرداخت شده", date: "۲ شهریور ۱۴۰۵" },
  { id: "AZ-9040", student: "حسین احمدی", item: "فرش‌بافی متوسط (حضوری)", amount: 6500000, status: "در انتظار پرداخت", date: "۳ شهریور ۱۴۰۵" },
  { id: "AZ-9039", student: "نگار رضایی", item: "رنگرزی سنتی (آنلاین)", amount: 3200000, status: "پرداخت شده", date: "۱ شهریور ۱۴۰۵" },
  { id: "AZ-9038", student: "لیلا کریمی", item: "گلیم‌بافی مقدماتی (حضوری)", amount: 4800000, status: "پرداخت شده", date: "۳۰ مرداد ۱۴۰۵" },
  { id: "AZ-9037", student: "امیر حسینی", item: "طراحی نقشه (آنلاین)", amount: 3650000, status: "لغو شده", date: "۲۸ مرداد ۱۴۰۵" },
];

/** Demo enrollments so the student dashboard/course player is demonstrable out of the box. */
export const enrollments: Enrollment[] = [
  { id: "en-seed-1", userId: "u-sara", courseSlug: "gabbeh-weaving", orderId: "AZ-9041", createdAt: "۲ شهریور ۱۴۰۵", completed: [] },
  { id: "en-seed-2", userId: "u-sara", courseSlug: "kilim-weaving-start", createdAt: "۱۵ تیر ۱۴۰۵", completed: [] },
];

export const certificates: Certificate[] = [
  { code: "AZ-C-1182", student: "سارا محمدی", course: "گلیم‌بافی مقدماتی", date: "تیر ۱۴۰۵", hours: 12 },
  { code: "AZ-C-1204", student: "سارا محمدی", course: "رنگرزی سنتی", date: "مرداد ۱۴۰۵", hours: 14 },
];

/** Images available for courses/classes in admin forms. */
export const galleryImages = [
  { value: "/images/course-carpet.jpg", label: "فرش (لچک‌ترنج)" },
  { value: "/images/course-kilim.jpg", label: "گلیم" },
  { value: "/images/course-dye.jpg", label: "رنگرزی" },
  { value: "/images/course-restore.jpg", label: "مرمت" },
  { value: "/images/course-design.jpg", label: "طراحی نقشه" },
  { value: "/images/workshop-loom.jpg", label: "دار قالی کارگاه" },
  { value: "/images/workshop-threads.jpg", label: "نخ‌های رنگی" },
  { value: "/images/hero-weaver.jpg", label: "دست‌های بافنده" },
];

/** Portrait images for instructor profiles (plus anything uploaded from the media library). */
export const instructorImages = [
  { value: "/images/instructor-dyer.jpg", label: "پرتره مدرس (کارگاه رنگرزی)" },
  { value: "/images/master-portrait.jpg", label: "پرتره استاد" },
  { value: "/images/hero-weaver.jpg", label: "دست‌های بافنده" },
  { value: "/images/workshop-loom.jpg", label: "دار قالی کارگاه" },
];

/* ---------------- Seed: users (demo passwords in README) ---------------- */

export const users: User[] = [
  {
    id: "u-admin",
    name: "مدیر کل",
    phone: "09120000001",
    passwordHash:
      "81adbf3c04265dc81743a631ab42b3c7:e4dd68a3a1b89d720ea6cb9baa300c5592c617230eecc461b2d63f94d1ff789603e94ebfcb60f4c4c37531e0334f40d6b439f78f4db995490e92525adcf0164b",
    role: "admin",
    createdAt: "۱ شهریور ۱۴۰۵",
  },
  {
    id: "u-editor",
    name: "ویراستار محتوا",
    phone: "09120000002",
    passwordHash:
      "a71ddf28f34b5a754a7905d5e7ccb9e7:746d0db4edc9b578b2c5c5e445a57a14ad9b00110116b13f904c67707db432f193d822a8459bbe8a0c388c38778c4c11c450c6d18068f67df434e7444805b57c",
    role: "editor",
    createdAt: "۱ شهریور ۱۴۰۵",
  },
  {
    id: "u-support",
    name: "کارشناس پشتیبانی",
    phone: "09120000003",
    passwordHash:
      "1b855b8bef946ffc464a0c92ca72fdee:28b98ca60b78afa8116a907091e8f537992b73835fa107b5f97b26dc74451cceb6959513fc59b5230625a3311f832065801e5b9d5c272df7c8d94b05bb1c9336",
    role: "support",
    createdAt: "۱ شهریور ۱۴۰۵",
  },
  {
    // password: dyer1234
    id: "u-maryam",
    name: "استاد مریم نادری",
    phone: "09120000004",
    passwordHash:
      "32aef96e8becaf973891ce257068bc6c:0398dbd61c9c4e6ac33d4b1243b70e6a774522b6d99a118923f019119d080dcb165110823cd4b6ae458c082d5d4619a34a8dc4ad0352f8054eea811f5194d379",
    role: "instructor",
    createdAt: "۱ شهریور ۱۴۰۵",
  },
  {
    id: "u-sara",
    name: "سارا محمدی",
    phone: "09123456789",
    passwordHash:
      "a71ea466ea9de1bcb867107deadb2075:501c301815a149eba9f37eb08ec7dc3f3a7d58a4dbb65289a2e6c14c0cc326c02c6da9f19ee1a89c891ffa07b4df7ba873c87c483eff81df67a7ca614ca355ef",
    role: "student",
    createdAt: "۱ تیر ۱۴۰۵",
  },
];

export const comments: Comment[] = [
  {
    id: "cm-1",
    scope: "course",
    slug: "carpet-weaving-foundations",
    name: "حسین احمدی",
    text: "برای شروع هیچ ابزاری نداشتم؛ لیست خریدی که استاد داد دقیق و به‌صرفه بود. الان جلسه هشتم هستم و راضی‌ام.",
    date: "۲ شهریور ۱۴۰۵",
    status: "approved",
  },
  {
    id: "cm-2",
    scope: "course",
    slug: "kilim-weaving-start",
    name: "لیلا کریمی",
    text: "رفع‌اشکال تصویری عالی است؛ ایراد دفتین من را از روی عکس تشخیص دادند و درست شد.",
    date: "۳ شهریور ۱۴۰۵",
    status: "approved",
  },
];

export const defaultProtection: CourseProtection = {
  securePlayer: true,
  burnWatermark: false,
  overlayWatermark: true,
  spotPlayer: false,
  spotPlayerCourseIds: [],
  maxDevices: 2,
  blockDownload: true,
};

export const defaultShippingMethods: ShippingMethod[] = [
  { id: "post", label: "پست پیشتاز", description: "ارسال به سراسر کشور با کد رهگیری", cost: 120000, freeOver: 0, etaDays: "۳ تا ۵ روز کاری", active: true },
  { id: "tipax", label: "تیپاکس", description: "مناسب اقلام حجیم مثل دار قالی", cost: 250000, freeOver: 0, etaDays: "۲ تا ۴ روز کاری", active: true },
  { id: "freight", label: "باربری (پس‌کرایه)", description: "برای دارهای بزرگ؛ هزینه در مقصد دریافت می‌شود", cost: 0, freeOver: 0, etaDays: "۴ تا ۷ روز کاری", active: true },
  { id: "pickup", label: "تحویل حضوری در کارگاه", description: "ارومیه، خیابان امام، کوی دی (نجارخانه)", cost: 0, freeOver: 0, etaDays: "همان روز", active: true },
];

export const products: Product[] = [
  {
    slug: "loom-tabletop-60",
    title: "دار قالی رومیزی ۶۰×۸۰ (چوب راش)",
    category: "دار قالی",
    kind: "physical",
    price: 3900000,
    oldPrice: 4400000,
    stock: 6,
    allowBackorder: false,
    image: "/images/workshop-loom.jpg",
    gallery: ["/images/workshop-loom.jpg", "/images/hero-weaver.jpg"],
    excerpt: "دار سبک و قابل تنظیم برای شروع فرش‌بافی در خانه؛ همان مدلی که در دوره مقدماتی استفاده می‌شود.",
    description: [
      "این دار از چوب راش خشک‌شده ساخته می‌شود و با پیچ‌های تنظیم کشش، چله‌کشی را برای مبتدی‌ها ساده می‌کند.",
      "ابعاد مفید بافت ۶۰×۸۰ سانتی‌متر است و برای بافت قالیچه، تابلوفرش و پروژه‌های دوره مقدماتی کافی است.",
    ],
    specs: [
      { label: "جنس", value: "چوب راش" },
      { label: "ابعاد مفید", value: "۶۰×۸۰ سانتی‌متر" },
      { label: "وزن", value: "۶٫۵ کیلوگرم" },
      { label: "متعلقات", value: "شانه، دفتین، قلاب و راهنمای چله‌کشی" },
    ],
    shippingMethods: ["tipax", "freight", "pickup"],
    weightGrams: 6500,
    badge: "پرفروش",
    featured: true,
    active: true,
    sku: "AZ-LOOM-60",
    createdAt: "۱ شهریور ۱۴۰۵",
    sold: 41,
  },
  {
    slug: "loom-custom",
    title: "دار قالی سفارشی (ساخت در کارگاه)",
    category: "دار قالی",
    kind: "preorder",
    price: 7500000,
    stock: 0,
    allowBackorder: true,
    preorder: { depositPercent: 40, leadTimeDays: 21, note: "قیمت نهایی بر اساس ابعاد و جنس چوب پس از بررسی اعلام می‌شود." },
    image: "/images/workshop-loom.jpg",
    gallery: ["/images/workshop-loom.jpg"],
    excerpt: "دار فلزی یا چوبی با ابعاد دلخواه شما؛ از دار ۱ متری تا دار ۳ متری کارگاهی. ساخت در نجارخانه اسدزاده.",
    description: [
      "ابعاد، جنس (چوب راش، چوب نراد یا پروفیل فلزی) و نوع سیستم کشش (پیچی یا گوه‌ای) را انتخاب کنید.",
      "زمان ساخت معمولاً سه هفته است. پس از ثبت پیش‌سفارش، کارشناس ما برای تأیید مشخصات تماس می‌گیرد و قیمت قطعی اعلام می‌شود.",
    ],
    specs: [
      { label: "عرض", value: "۱۰۰ تا ۳۰۰ سانتی‌متر" },
      { label: "جنس", value: "راش / نراد / فلزی" },
      { label: "سیستم کشش", value: "پیچی یا گوه‌ای" },
    ],
    shippingMethods: ["freight", "pickup"],
    weightGrams: 30000,
    badge: "پیش‌سفارش",
    featured: true,
    active: true,
    sku: "AZ-LOOM-CUSTOM",
    createdAt: "۱ شهریور ۱۴۰۵",
    sold: 12,
  },
  {
    slug: "tool-kit-starter",
    title: "ست ابزار بافت مبتدی (قلاب، دفتین، شانه، قیچی)",
    category: "ابزار",
    kind: "physical",
    price: 890000,
    stock: 24,
    allowBackorder: false,
    image: "/images/workshop-threads.jpg",
    gallery: ["/images/workshop-threads.jpg"],
    excerpt: "چهار ابزار اصلی که برای شروع بافت لازم دارید؛ انتخاب‌شده توسط استاد اسدزاده.",
    description: ["همه ابزارها دست‌ساز و از نوعی هستند که بافندگان حرفه‌ای تبریز استفاده می‌کنند."],
    specs: [
      { label: "قلاب", value: "فولادی، دسته چوبی" },
      { label: "دفتین", value: "فلزی ۱۲ دندانه" },
      { label: "قیچی", value: "قیچی پرداخت کج" },
    ],
    shippingMethods: ["post", "tipax", "pickup"],
    weightGrams: 900,
    featured: true,
    active: true,
    sku: "AZ-KIT-01",
    createdAt: "۱ شهریور ۱۴۰۵",
    sold: 118,
  },
  {
    slug: "wool-yarn-pack-12",
    title: "بسته نخ پشمی ۱۲ رنگ (رنگرزی طبیعی)",
    category: "نخ و مواد",
    kind: "physical",
    price: 1450000,
    stock: 15,
    allowBackorder: true,
    image: "/images/workshop-threads.jpg",
    gallery: ["/images/workshop-threads.jpg", "/images/course-dye.jpg"],
    excerpt: "دوازده کلاف پشم دست‌ریس رنگ‌شده با روناس، اسپرک، نیل و پوست گردو؛ کافی برای یک قالیچه ۴۰×۶۰.",
    description: ["نخ‌ها در کارگاه رنگرزی اسدزاده و با همان فرمول‌های دوره رنگرزی سنتی رنگ شده‌اند."],
    specs: [
      { label: "وزن هر کلاف", value: "۱۰۰ گرم" },
      { label: "ضخامت", value: "۴ لا" },
    ],
    shippingMethods: ["post", "tipax", "pickup"],
    weightGrams: 1300,
    featured: false,
    active: true,
    sku: "AZ-YARN-12",
    createdAt: "۱ شهریور ۱۴۰۵",
    sold: 63,
  },
  {
    slug: "map-lachak-toranj-40-60",
    title: "نقشه فرش لچک‌ترنج ۴۰×۶۰ (چاپی + فایل)",
    category: "نقشه",
    kind: "physical",
    price: 350000,
    stock: 50,
    allowBackorder: true,
    image: "/images/course-design.jpg",
    gallery: ["/images/course-design.jpg"],
    excerpt: "نقشه نقطه‌چین با راهنمای رنگ؛ همان پروژه نهایی دوره فرش‌بافی مقدماتی.",
    description: ["نقشه به‌صورت چاپ رنگی روی کاغذ شطرنجی به همراه فایل PDF ارسال می‌شود."],
    specs: [{ label: "رج‌شمار", value: "۴۰ رج" }],
    shippingMethods: ["post", "pickup"],
    weightGrams: 200,
    featured: false,
    active: true,
    sku: "AZ-MAP-01",
    createdAt: "۱ شهریور ۱۴۰۵",
    sold: 210,
  },
];

export const defaultSettings: Settings = {
  site: {
    siteName: "اسدزاده",
    tagline: "آموزش فرش و گلیم ایرانی",
    phone: "۰۲۱-۱۲۳۴۵۶۷۸",
    email: "hello@asadzedeh.ir",
    address: "ارومیه، خیابان امام، خیابان عطایی، کوی دی (نجارخانه)، آموزشگاه اسدزاده",
    siteUrl: "https://asadzedeh.ir",
    announcement: {
      enabled: true,
      text: "ثبت‌نام ترم پاییز شروع شد — ۱۰٪ تخفیف ثبت‌نام زودهنگام",
      link: "/classes",
    },
    hero: {
      badge: "آموزش تخصصی فرش، گلیم و هنرهای بافت ایرانی",
      titleA: "هنر ایرانی را",
      titleHighlight: "از استاد",
      titleB: "یاد بگیرید",
      subtitle:
        "آموزش تخصصی فرش، گلیم و هنرهای بافت ایرانی به‌صورت آنلاین و حضوری؛ از اولین گره تا بافت اثری که امضای شماست — قدم‌به‌قدم با استادکار.",
      primaryCta: "مشاهده دوره‌های آنلاین",
      secondaryCta: "کلاس‌های حضوری",
      image: "/images/hero-weaver.jpg",
      note: "کارگاه اسدزاده — جایی که هر گره، با حوصله و اصالت زده می‌شود",
    },
    footerAbout:
      "اسدزاده؛ آموزش تخصصی فرش، گلیم و هنرهای بافت ایرانی به‌صورت آنلاین و حضوری. سه نسل تجربه بافت، حالا در قالب دوره‌های مدرن و کاربردی.",
    socials: { instagram: "#", telegram: "#" },
    aboutIntro: [
      "همه‌چیز با یک دار چوبی در خانه پدربزرگ شروع شد. ما بچه‌هایی بودیم که به‌جای بازی، نخ‌های رنگی را جدا می‌کردیم و رج می‌شمردیم. فرش برای ما فقط یک هنر نبود؛ زبان خانه بود.",
      "سال ۱۳۹۰ وقتی اولین کلاس را برگزار کردیم، فکر نمی‌کردیم روزی هنرجویانی از سراسر ایران داشته باشیم. امروز با افتخار می‌گوییم: بیش از ۱۲۰۰ نفر با ما اولین گره زندگی‌شان را زده‌اند و ده‌ها نفرشان حالا خودشان مدرس و کارگاه‌دارند.",
    ],
    workshop: {
      lat: 37.5527,
      lng: 45.0761,
      address: "ارومیه، خیابان امام، خیابان عطایی، کوی دی (نجارخانه)، آموزشگاه اسدزاده",
      mapProvider: "neshan",
    },
  },
  sms: { provider: "demo", apiKey: "", sender: "" },
  email: { host: "", port: 587, user: "", pass: "", from: "" },
  payment: { provider: "demo", merchantId: "", sandbox: true },
  security: { requireStaff2fa: false, adminSessionMinutes: 120, maxFailedLogins: 5, lockMinutes: 15 },
  video: {
    defaults: defaultProtection,
    signedUrlSeconds: 900,
    transcode: true,
    ffmpegPath: "auto",
    watermarkExtra: "asadzedeh.ir",
    watermarkIntervalSec: 12,
    playerColor: "#2f8c87",
  },
  spotplayer: {
    enabled: false,
    apiKey: "",
    test: true,
    devices: { all: 2, windows: 1, mac: 0, android: 1, ios: 0, web: 1 },
    defaultCourseId: "",
  },
  instagram: {
    enabled: true,
    username: "asadzedeh.carpet",
    posts: [],
    embedUrl: "",
    title: "اینستاگرام اسدزاده",
    description: "پشت‌صحنه کارگاه، آثار هنرجویان و نکات کوتاه بافت را در اینستاگرام دنبال کنید.",
  },
  shop: {
    enabled: true,
    title: "فروشگاه ملزومات بافت",
    description: "دار قالی، ابزار، نخ و مواد رنگرزی؛ همان چیزهایی که در کارگاه استفاده می‌کنیم.",
    shippingMethods: defaultShippingMethods,
    freeShippingOver: 5000000,
    preorderDepositPercent: 40,
    preorderIntro:
      "دارهای قالی و گلیم در کارگاه نجاری اسدزاده به سفارش شما ساخته می‌شوند. ابعاد و جنس چوب را انتخاب کنید؛ پس از تأیید قیمت، با پرداخت بیعانه ساخت شروع می‌شود.",
  },
  legal: {
    pages: [
      {
        slug: "terms",
        title: "قوانین و مقررات",
        content: "<h2>قوانین و مقررات آموزشگاه اسدزاده</h2><p>با استفاده از خدمات آموزشگاه اسدزاده، شما شرایط زیر را می‌پذیرید:</p><h3>۱. ثبت‌نام و دسترسی</h3><p>پس از ثبت‌نام در دوره، دسترسی به ویدیوها به‌صورت مادام‌العمر خواهد بود. هر دوره شامل ویدیوهای آموزشی، تمرین‌ها و ارزیابی نهایی است.</p><h3>۲. پرداخت و بازگشت وجه</h3><p>تا ۷ روز پس از ثبت‌نام، در صورت عدم رضایت، امکان بازگشت وجه وجود دارد. پس از گذشت این مهلت، مبلغ قابل برگشت نیست.</p><h3>۳. گواهی پایان دوره</h3><p>گواهی پس از قبولی در ارزیابی نهایی صادر می‌شود. اطلاعات درج‌شده در گواهی بر اساس پروفایل کاربر است.</p>",
        lastUpdated: "۱۴۰۴/۰۱/۰۱",
      },
      {
        slug: "privacy",
        title: "حریم خصوصی",
        content: "<h2>سیاست حفظ حریم خصوصی</h2><p>حریم خصوصی کاربران برای ما بسیار مهم است. این سند توضیح می‌دهد چه اطلاعاتی جمع‌آوری می‌شود و چگونه استفاده می‌شود.</p><h3>۱. اطلاعات جمع‌آوری‌شده</h3><ul><li>نام و شماره موبایل (برای ثبت‌نام و واترمارک ویدیو)</li><li>ایمیل (اختیاری)</li><li>استان و شهر (اختیاری)</li><li>تاریخچه پیشرفت دوره‌ها</li></ul><h3>۲. استفاده از اطلاعات</h3><p>اطلاعات شما صرفاً برای ارائه خدمات آموزشی، صدور گواهی و بهبود تجربه یادگیری استفاده می‌شود.</p><h3>۳. امنیت اطلاعات</h3><p>تمامی اطلاعات با رمزنگاری مناسب ذخیره و منتقل می‌شوند. شماره موبایل به‌عنوان واترمارک روی ویدیوها نمایش داده می‌شود.</p>",
        lastUpdated: "۱۴۰۴/۰۱/۰۱",
      },
      {
        slug: "rules",
        title: "قوانین استفاده",
        content: "<h2>قوانین استفاده از خدمات</h2><h3>۱. حساب کاربری</h3><p>هر کاربر مسئول حفظ امنیت رمز عبور خود است. در صورت مشکوک شدن به دسترسی غیرمجاز، بلافاصله رمز عبور را تغییر دهید.</p><h3>۲. محتوای آموزشی</h3><p>ویدیوها و محتوای دوره‌ها متعلق به آموزشگاه اسدزاده است. کپی‌برداری، انتشار یا فروش محتوا بدون اجازه مکتوب ممنوع است.</p><h3>۳. رفتار کاربران</h3><p>استفاده از خدمات برای اهداف غیرقانونی یا آزار دیگران ممنوع است. در صورت نقض قوانین، حساب کاربری بدون اخطار قبلی مسدود خواهد شد.</p>",
        lastUpdated: "۱۴۰۴/۰۱/۰۱",
      },
    ],
  },
};
