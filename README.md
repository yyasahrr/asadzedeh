# اسدزاده | Asadzedeh — آموزش فرش، گلیم و هنرهای بافت ایرانی

پلتفرم آموزشی فارسی و راست‌به‌چپ (RTL) برند «اسدزاده»؛ ساخته‌شده با **Next.js (App Router) + TypeScript + Tailwind CSS v4**.

ساختار آموزشی سایت (Hero ساده، کارت‌های دوره، مسیر یادگیری، اعتمادسازی، معرفی استاد) از الگوهای
پلتفرم‌های آموزشی مدرن الهام گرفته شده، اما هویت بصری — رنگ، تایپوگرافی، پترن و تصاویر —
کاملاً متعلق به دنیای فرش و گلیم ایرانی است.

## شروع

```bash
npm ci           # package-lock.json is authoritative — npm ci, not npm install
cp .env.example .env.local
npm run dev      # http://localhost:3000
npm run build    # بررسی تولید
```

داده‌های production در **PostgreSQL** (`DATABASE_URL`) نگه‌داری می‌شود. در توسعه، اگر
`DATABASE_URL` تنظیم نشده باشد، یک پایگاه‌داده محلی PGlite زیر `data/pglite` ساخته می‌شود.
در production نبودِ `DATABASE_URL` باعث **توقف اجرای برنامه** می‌شود (fail fast).

| اسکریپت | کار |
|---|---|
| `npm run dev` / `npm start` | سرور توسعه / production (`server.mjs` = Next.js + ریدایرکت‌های سئو) |
| `npm run build` | ساخت production |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | تست واحد + یکپارچگی (Vitest، روی PGlite درون‌حافظه‌ای) |
| `npm run test:e2e` | تست End-to-End (Playwright؛ ابتدا `npm run test:e2e:install`) |
| `npm run db:migrate` | اعمال مهاجرت‌های `drizzle/*.sql` |
| `npm run db:seed` | داده نمونه (فقط توسعه) |
| `npm run db:bootstrap-admin` | ساخت نخستین مدیر ارشد |
| `npm run db:migrate-json` | انتقال `data/db.json` قدیمی به PostgreSQL |
| `npm run db:generate` / `db:push` | تولید/اعمال اسکیمای Drizzle |
| `npm run seo:audit` | ممیزی سئو (PASS / WARN / ERROR) |

CI: فایل `ci/ci.yml` را به `.github/workflows/ci.yml` منتقل کنید.

مستندات: `docs/DEPLOY.md` · `docs/ENV.md` · `docs/DATABASE.md` · `docs/PAYMENT.md` · `docs/BACKUP.md` · `docs/backup-restore.md` · `docs/SECURITY.md` · `docs/SEO.md`.

گزارش‌های آمادگی: `GO_LIVE_CHECKLIST.md` · `FINAL_GO_LIVE_GAP_REPORT.md` · `PRODUCTION_READINESS_REPORT.md`.

## پنل مدیریت واقعی + گواهی PDF

- **مدیریت دوره‌ها و کلاس‌ها**: افزودن، ویرایش و حذف کامل از `/admin` با Server Action؛
  تغییرات بلافاصله روی سایت دیده می‌شود. هنرجویان، وضعیت سفارش‌ها و صدور گواهی هم واقعی است.
- **ذخیره‌سازی**: PostgreSQL با لایه Drizzle (`lib/db/schema.ts`، مهاجرت‌ها در `drizzle/`).
  `lib/store.ts` کش اسنادی روی همان جداول است. `data/db.json` دیگر پایگاه‌داده اجرایی نیست و
  فقط به‌عنوان ورودی یک‌بارمصرفِ `npm run db:migrate-json` باقی مانده است.
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

## پشتیبانی، درگاه‌ها، پیامک و بازارگاه‌ها

| بخش | مسیر تنظیم | توضیح |
|---|---|---|
| دکمه پشتیبانی شناور | `/admin/settings` | دکمه‌ای شناور در همه صفحات؛ با کلیک، تلگرام/واتساپ/تماس/ایمیل باز می‌شود. محل نمایش (چپ یا راست) و راه‌های ارتباطی قابل تنظیم است. |
| درگاه‌های پرداخت | `/admin/payments` | زرین‌پال، زیبال، آیدی‌پی، پی‌پینگ، نکست‌پی، آقای پرداخت. اطلاعات هر درگاه جدا ذخیره می‌شود و با تعویض درگاه فعال پاک نمی‌شود. |
| سامانه‌های پیامکی | `/admin/settings` | کاوه‌نگار، قاصدک، sms.ir، ملی‌پیامک، فراز (ippanel)، رایگان اس‌ام‌اس — با کلید API یا نام‌کاربری/رمز، و پشتیبانی از الگو (پترن) برای کد ورود. |
| ورود با شماره و کد (OTP) | `/admin/settings` | ورود بدون رمز عبور با کد پیامکی؛ کد فقط هش‌شده ذخیره می‌شود، یک‌بارمصرف است، منقضی می‌شود و سقف ارسال در ساعت دارد. امکان ثبت‌نام خودکار شماره جدید. |
| بازارگاه‌ها | `/admin/marketplaces` | فید محصولات برای ترب، ایمالز، باسلام و دیجی‌کالا از `/api/marketplace/[channel]` (JSON و `?format=csv`)، با کلید اختیاری برای محدودکردن دسترسی. |

> نکته امنیتی: کاربران کارکنان با ورود OTP هم همچنان مرحله دوم (TOTP) را رد می‌کنند؛ کد یک‌بارمصرف تنها عامل اول است.

متغیرهای محیطی مهم در `.env.example`: `APP_SECRET` (الزامی در production)، `FFMPEG_PATH` و `SPOTPLAYER_API_KEY` (اختیاری).

## استقرار روی cPanel (Node.js Application)

1. در cPanel از **Setup Node.js App**، نسخه Node `22.x` یا بالاتر را انتخاب کنید و ریشه برنامه را روی پوشه پروژه بگذارید.
2. فایل‌های پروژه را بدون `node_modules` و بدون `.env` آپلود کنید؛ سپس در **Terminal** همان برنامه اجرا کنید:

   ```bash
   npm ci
   npm run build
   ```

3. متغیرهای `.env.example` را در بخش Environment Variables cPanel ثبت کنید. در production مقدار تصادفی و ثابت برای `APP_SECRET` الزامی است.
4. Startup file را `server.mjs` و Application startup command را `npm start` بگذارید. پورت را cPanel از متغیر `PORT` تزریق می‌کند؛ آن را دستی hardcode نکنید.
5. پوشه‌های `data/videos/` و `data/lesson-files/` باید برای کاربر برنامه قابل نوشتن باشند.
   داده‌های اصلی در PostgreSQL است؛ پیش از اولین اجرا `npm run db:migrate` را بزنید.
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
  db/schema.ts          # اسکیمای Drizzle (جداول، کلیدها، ایندکس‌ها)
  db/commerce.ts        # رزرو موجودی/ظرفیت و گذار پرداخت با SQL اتمیک
  store.ts              # لایه داده (کش اسنادی روی PostgreSQL)
  checkout-lines.ts     # ساخت خطوط سفارش؛ قیمت فقط از سمت سرور
  stock.ts              # موجودی/ظرفیت قابل فروش (منهای رزروها)
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
