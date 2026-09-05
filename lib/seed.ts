import type {
  Certificate,
  Comment,
  Order,
  Settings,
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
  },
  sms: { provider: "demo", apiKey: "", sender: "" },
  email: { host: "", port: 587, user: "", pass: "", from: "" },
  payment: { provider: "demo", merchantId: "", sandbox: true },
};
