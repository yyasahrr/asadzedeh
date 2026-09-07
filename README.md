# اسدزاده | Asadzedeh — آموزش فرش، گلیم و هنرهای بافت ایرانی

پلتفرم آموزشی فارسی و راست‌به‌چپ (RTL) برند «اسدزاده»؛ ساخته‌شده با **Next.js (App Router) + TypeScript + Tailwind CSS v4**.

ساختار آموزشی سایت (Hero ساده، کارت‌های دوره، مسیر یادگیری، اعتمادسازی، معرفی استاد) از الگوهای
پلتفرم‌های آموزشی مدرن الهام گرفته شده، اما هویت بصری — رنگ، تایپوگرافی، پترن و تصاویر —
کاملاً متعلق به دنیای فرش و گلیم ایرانی است.

## شروع

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # بررسی تولید
```

## پنل مدیریت واقعی + گواهی PDF

- **مدیریت دوره‌ها و کلاس‌ها**: افزودن، ویرایش و حذف کامل از `/admin` با Server Action؛
  تغییرات بلافاصله روی سایت دیده می‌شود. هنرجویان، وضعیت سفارش‌ها و صدور گواهی هم واقعی است.
- **ذخیره‌سازی**: فایل `data/db.json` (خودکار از `lib/data.ts` مقداردهی اولیه می‌شود و در گیت نیست).
  برای production کافی است توابع `lib/store.ts` را با دیتابیس واقعی جایگزین کنید.
- **گواهی پایان دوره**: طرح A4 افقی با مهر آموزشگاه، امضا و کد یکتا؛
  هنرجو از پنل خودش PDF می‌گیرد و اصالت هر گواهی در `/verify/[code]` قابل استعلام است.

## ماژول‌های جدید (ویدیو، امنیت، فروشگاه)

| بخش | مسیر | توضیح |
|---|---|---|
| تیزر دوره/کلاس | فرم دوره و کلاس در ادمین | آپلود اختصاصی یا embed؛ نمایش با `components/video/TrailerBlock.tsx` |
| جلسات دوره | `/admin/courses/[slug]/lessons` | آپلود تکه‌تکه (`/api/video/upload`)، فصل‌بندی، پیش‌نمایش رایگان |
| پلیر امن | `components/video/SecurePlayer.tsx` | توکن امضاشده کوتاه‌عمر، واترمارک متحرک با شماره موبایل بیننده، Range streaming از `data/videos/` |
| اسپات‌پلیر | `lib/spotplayer.ts` | صدور لایسنس با واترمارک شماره پس از پرداخت (API Key از ادمین) |
| پنل هنرجو | `/dashboard/courses/[slug]` | پخش جلسات، پیشرفت، تکمیل خودکار، گواهی |
| ۲FA | `/account/security`, `/auth/verify` | TOTP سازگار با Google Authenticator + کد بازیابی؛ سیاست اجباری کارکنان از `/admin/security` |
| لاگ سیستم | `/admin/audit` | ممیزی ساخت‌یافته با زنجیره هش، فیلتر و خروجی CSV |
| مدرسان | `/admin/instructors`, `/instructor` | چند مدرس، هرکدام با پنل استاد مستقل |
| فروشگاه | `/shop`, `/admin/shop` | محصول، قیمت، موجودی، روش ارسال؛ پیش‌سفارش ساخت با بیعانه و خط زمانی (`/shop/preorder`) |
| اینستاگرام | `components/home/InstagramEmbed.tsx` | embed رسمی قبل از فوتر؛ تنظیم از `/admin/content` |

متغیرهای محیطی مهم در `.env.example`: `APP_SECRET` (الزامی در production)، `FFMPEG_PATH` و `SPOTPLAYER_API_KEY` (اختیاری).

## استقرار روی cPanel (Node.js Application)

1. در cPanel از **Setup Node.js App**، نسخه Node `20.x` یا بالاتر را انتخاب کنید و ریشه برنامه را روی پوشه پروژه بگذارید.
2. فایل‌های پروژه را بدون `node_modules` و بدون `.env` آپلود کنید؛ سپس در **Terminal** همان برنامه اجرا کنید:

   ```bash
   npm ci
   npm run build
   ```

3. متغیرهای `.env.example` را در بخش Environment Variables cPanel ثبت کنید. در production مقدار تصادفی و ثابت برای `APP_SECRET` الزامی است.
4. Startup file را `server.mjs` و Application startup command را `npm start` بگذارید. پورت را cPanel از متغیر `PORT` تزریق می‌کند؛ آن را دستی hardcode نکنید.
5. پوشه‌های `data/`, `data/videos/`, `data/lesson-files/` و `public/uploads/` باید برای کاربر برنامه قابل نوشتن باشند. فایل `data/db.json` در اولین اجرا ساخته می‌شود.
6. پس از تغییر کد، `npm run build` را دوباره اجرا و برنامه Node.js را از cPanel با **Restart** راه‌اندازی کنید. دامنه را با SSL به برنامه متصل کنید.

> این پروژه به Node.js نیاز دارد و روی هاست cPanel صرفاً PHP اجرا نمی‌شود. اگر سرویس Node.js یا فضای کافی برای ویدیوهای حجیم در دسترس نیست، باید هاست/فضای ذخیره‌سازی جداگانه تهیه شود.

## ساختار

```
app/
  page.tsx              # صفحه اصلی (۱۱ سکشن)
  courses/              # دوره‌های آنلاین + صفحه جزئیات
  classes/              # کلاس‌های حضوری + صفحه جزئیات
  paths/                # مسیرهای آموزشی
  instructors/          # اساتید
  blog/                 # دانشنامه + صفحه مقاله
  about/ cart/ auth/    # درباره ما، سبد خرید، ورود (+ تأیید دومرحله‌ای)
  shop/                 # فروشگاه لوازم + پیش‌سفارش
  checkout/             # تسویه‌حساب یکپارچه دوره/کالا
  dashboard/            # پنل هنرجو (+ پخش‌کننده امن دوره)
  instructor/           # پنل استاد
  account/security      # ورود دومرحله‌ای و نشست‌ها
  admin/                # پنل مدیریت (دوره، ویدیو، فروشگاه، پیش‌سفارش، لاگ، امنیت، …)
  api/video/            # آپلود تکه‌تکه، توکن پخش، استریم/HLS امن
components/
  ui/                   # Button, Badge, Input, Stars, ProgressBar, SectionHeading
  layout/               # Header, Footer, MobileMenu
  cards/                # CourseCard, InPersonCourseCard, LearningPathCard, ...
  home/                 # سکشن‌های صفحه اصلی
  dashboard/ admin/     # اجزای پنل‌ها
lib/
  data.ts               # داده نمایشی فارسی
  store.ts              # لایه داده (data/db.json)
  auth.ts / totp.ts     # نشست، نقش‌ها، امضای توکن، TOTP
  access.ts             # چه کسی چه ویدیویی را می‌بیند
  video.ts              # مخزن ویدیو، ffmpeg (اختیاری)، واترمارک
  spotplayer.ts         # API اسپات‌پلیر
  audit.ts              # لاگ ممیزی با زنجیره هش
  format.ts             # اعداد و قیمت فارسی
  types.ts              # تایپ‌های دامنه
```

## دیزاین‌سیستم

توکن‌ها در `app/globals.css` با `@theme` تعریف شده‌اند (بدون هاردکد در کامپوننت‌ها):

| توکن | مقدار |
|---|---|
| پس‌زمینه | `#F3E9D6` |
| CTA اصلی | `#193B5C` |
| Accent | `#2F8C87` |
| Highlight | `#9D382C` |
| فوتر | `#152F3D` |

فونت: **وزیرمتن** (Vazirmatn Variable، خودمیزبان با Fontsource — بدون وابستگی به CDN خارجی).
کامپوننت‌ها به‌صورت پیش‌فرض Server Component هستند؛ فقط تعامل‌ها (منوی موبایل، فیلتر دوره‌ها، تب ورود) Client هستند.
