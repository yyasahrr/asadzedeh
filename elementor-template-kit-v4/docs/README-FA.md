# کیت المنتور آکادمی اسدزاده — V5

این کیت یک پیاده‌سازی کامل وردپرس/المنتور برای آکادمی اسدزاده است: صفحات عمومی،
نظام آموزش آنلاین (LearnDash)، کلاس‌های حضوری، فروشگاه (WooCommerce)،
ورود با رمز یک‌بارمصرف (Digits)، پنل هنرجو، گواهی‌ها و وضعیت‌های خطا/خالی.

تعداد قالب‌ها: **70**
تعداد المان‌ها: **3350**
تعداد ویجت‌ها: **1488**
تعداد overrideهای ریسپانسیو: **1158**

## چرا از نسخهٔ قبلی متفاوت است

کیت قبلی از نظر تعداد قالب کامل به‌نظر می‌رسید اما در عمل چند نقص اساسی داشت:
صفحهٔ تک‌دوره فقط ۱۱ المان داشت (یک Shortcode shell)، ۲۰۱۸ المان عنوانِ معنادار
نداشتند، در کل ۵۶ قالب تنها ۴ المان override ریسپانسیو داشتند، هیچ CSS سفارشی
در کار نبود و المنت‌پک بیشتر تزئینی استفاده شده بود. این نسخه با یک مولّد
جدید ساخته شده که نام‌گذاری، ریسپانسیو، کلاس‌بندی و CSSِ محدود‌شده را روی
**همهٔ** المان‌ها به‌طور خودکار اعمال می‌کند، و یک ولیدیتور سخت‌گیرانه دارد که
خروجی را پیش از تحویل بررسی می‌کند.

## پیش‌نیازها

- Elementor و Elementor Pro
- BDThemes Element Pack Pro (برای Dynamic Grid و Advanced Button/Heading)
- LearnDash LMS (دوره، درس، موضوع، آزمون)
- WooCommerce و Persian WooCommerce
- Digits (ورود با رمز یک‌بارمصرف)
- ACF Pro (فیلدهای مسیر یادگیری، مدرس و آثار)
- برای قالب‌های دارای وضعیت NEEDS CUSTOM BACKEND: نصب فایل‌های `backend/`

## ترتیب نصب

۱. از فایل‌ها پشتیبان بگیرید و ابتدا روی یک سایت استیج امتحان کنید.
۲. افزونه‌های بالا را فعال کنید.
۳. دو فونت `Neirizi` و `Peyda` را در Elementor › Custom Fonts با همین نام ثبت کنید
   (هیچ فایل فونتی در این کیت بسته‌بندی نشده است).
۴. فایل‌های `backend/` را به‌صورت افزونه یا در `wp-content/mu-plugins/` قرار دهید و فعال کنید.
۵. قالب‌های `dist/direct-import` را یکی‌یکی یا با انتخاب چندتایی از مسیر
   **Templates › Saved Templates › Import Templates** وارد کنید.
   (فایل ZIP فقط برای راحتی جابه‌جایی است؛ خودِ ZIP را در همین مسیر import نکنید.)
۶. قالب‌های Theme Builder (سربرگ، پابرگ، Singleها، Loop Itemها) را طبق
   `THEME-BUILDER-CONDITIONS.md` به شرط نمایش وصل کنید.
7. مراحل دستی هر قالب را از `MANUAL-STEPS.md` انجام دهید.

## وضعیت‌ها

| وضعیت | معنا |
|---|---|
| READY | پس از Import بدون اقدام اضافی کار می‌کند |
| READY — NEEDS DYNAMIC BINDING | ساختار نهایی است؛ منبع داینامیک باید در ویرایشگر انتخاب شود |
| READY — NEEDS REAL CONTENT | متن/قیمت/تاریخ‌ها باید با مقادیر واقعی جایگزین شود |
| NEEDS CUSTOM BACKEND | نیازمند فایل‌های `backend/` این کیت است |

## فهرست قالب‌ها

| فایل | عنوان | نوع | المان‌ها | وضعیت |
|---|---|---|---|---|
| header.json | سربرگ — کل سایت | header | 22 | READY — NEEDS DYNAMIC BINDING |
| footer.json | پابرگ — کل سایت | footer | 51 | READY — NEEDS REAL CONTENT |
| section-hero.json | بخش قابل‌استفاده — Hero | section | 7 | READY |
| section-cta.json | بخش قابل‌استفاده — دعوت به اقدام | section | 9 | READY |
| section-empty-state.json | بخش قابل‌استفاده — وضعیت خالی | section | 10 | READY |
| section-trust.json | بخش قابل‌استفاده — نوار اعتماد | section | 15 | READY — NEEDS REAL CONTENT |
| home.json | خانه | page | 254 | READY — NEEDS REAL CONTENT |
| start-here.json | از کجا شروع کنم؟ | page | 72 | READY — NEEDS REAL CONTENT |
| about.json | دربارهٔ کارگاه | page | 130 | READY — NEEDS REAL CONTENT |
| contact.json | تماس با ما | page | 78 | READY — NEEDS REAL CONTENT |
| works.json | آثار هنرجویان | page | 88 | READY — NEEDS DYNAMIC BINDING |
| single-artwork.json | تک‌اثر — جزئیات | single | 71 | READY — NEEDS DYNAMIC BINDING |
| blog.json | مجله | page | 20 | READY |
| single-post.json | تک‌نوشته | single | 36 | READY |
| instructors.json | مدرسان | page | 66 | READY — NEEDS DYNAMIC BINDING |
| single-instructor.json | تک‌مدرس | single | 71 | READY — NEEDS DYNAMIC BINDING |
| gallery.json | گالری کارگاه | page | 38 | READY — NEEDS REAL CONTENT |
| faq.json | پرسش‌های پرتکرار | page | 40 | READY — NEEDS REAL CONTENT |
| support.json | پشتیبانی | page | 45 | READY — NEEDS REAL CONTENT |
| verify.json | استعلام گواهی | page | 40 | NEEDS CUSTOM BACKEND |
| privacy.json | حریم خصوصی | page | 32 | READY — NEEDS REAL CONTENT |
| terms.json | شرایط استفاده | page | 32 | READY — NEEDS REAL CONTENT |
| rules.json | قوانین دوره و کلاس | page | 29 | READY — NEEDS REAL CONTENT |
| refund.json | شرایط بازگشت وجه | page | 29 | READY — NEEDS REAL CONTENT |
| shipping.json | ارسال و تحویل | page | 26 | READY — NEEDS REAL CONTENT |
| courses.json | دوره‌های آنلاین — فهرست | page | 101 | READY |
| single-course.json | تک‌دوره — LearnDash | single | 192 | NEEDS CUSTOM BACKEND |
| lesson.json | درس | single | 37 | NEEDS CUSTOM BACKEND |
| topic.json | موضوع | single | 17 | READY |
| quiz.json | آزمون | single | 33 | READY |
| enrolled-course.json | پخش‌کنندهٔ دوره (در حال یادگیری) | page | 51 | NEEDS CUSTOM BACKEND |
| learning-paths.json | مسیرهای یادگیری — فهرست | page | 61 | READY — NEEDS DYNAMIC BINDING |
| learning-path-single.json | تک‌مسیر یادگیری | single | 119 | NEEDS CUSTOM BACKEND |
| workshops.json | کلاس‌های حضوری — فهرست | page | 135 | READY — NEEDS REAL CONTENT |
| class-single.json | تک‌کلاس حضوری | product | 73 | NEEDS CUSTOM BACKEND |
| shop.json | فروشگاه | product-archive | 25 | READY |
| single-product.json | تک‌محصول | product | 31 | READY |
| dashboard.json | داشبورد هنرجو | page | 110 | NEEDS CUSTOM BACKEND |
| my-courses.json | دوره‌های من | page | 75 | NEEDS CUSTOM BACKEND |
| my-classes.json | کلاس‌های حضوری من | page | 78 | NEEDS CUSTOM BACKEND |
| assignments.json | تکالیف | page | 66 | NEEDS CUSTOM BACKEND |
| certificates.json | گواهی‌های من | page | 71 | NEEDS CUSTOM BACKEND |
| certificate-single.json | جزئیات گواهی | page | 29 | NEEDS CUSTOM BACKEND |
| orders.json | سفارش‌های من | page | 42 | NEEDS CUSTOM BACKEND |
| order-detail.json | جزئیات سفارش | page | 33 | NEEDS CUSTOM BACKEND |
| profile.json | پروفایل | page | 42 | NEEDS CUSTOM BACKEND |
| account-security.json | امنیت حساب | page | 43 | NEEDS CUSTOM BACKEND |
| cart.json | سبد خرید | page | 74 | READY |
| cart-empty.json | سبد خرید — خالی | page | 41 | READY |
| checkout.json | تسویه‌حساب | page | 26 | READY |
| checkout-error.json | تسویه‌حساب — خطا | page | 26 | READY |
| payment-success.json | پرداخت موفق | page | 24 | READY |
| payment-failed.json | پرداخت ناموفق | page | 26 | READY |
| my-account.json | حساب کاربری | page | 32 | READY |
| order-tracking.json | پیگیری سفارش | page | 17 | NEEDS CUSTOM BACKEND |
| preorder.json | پیش‌خرید / لیست انتظار | page | 26 | NEEDS CUSTOM BACKEND |
| auth.json | ورود / ثبت‌نام | page | 22 | READY — NEEDS DYNAMIC BINDING |
| otp.json | تأیید کد یک‌بارمصرف | page | 29 | READY — NEEDS DYNAMIC BINDING |
| recovery.json | بازیابی حساب | page | 20 | READY — NEEDS DYNAMIC BINDING |
| auth-error.json | خطای ورود | page | 22 | READY — NEEDS DYNAMIC BINDING |
| search.json | جست‌وجو | page | 38 | READY |
| no-results.json | بدون نتیجه | page | 68 | NEEDS CUSTOM BACKEND |
| not-found.json | صفحهٔ ۴۰۴ | page | 17 | READY |
| generic-error.json | خطای عمومی | page | 15 | READY |
| maintenance.json | در دست تعمیر | page | 15 | READY |
| loop-course.json | Loop — دوره | loop-item | 9 | READY — NEEDS DYNAMIC BINDING |
| loop-product.json | Loop — محصول / کلاس | loop-item | 7 | READY — NEEDS DYNAMIC BINDING |
| loop-post.json | Loop — نوشته | loop-item | 7 | READY |
| loop-artwork.json | Loop — اثر | loop-item | 7 | READY — NEEDS DYNAMIC BINDING |
| loop-instructor.json | Loop — مدرس | loop-item | 7 | READY — NEEDS DYNAMIC BINDING |

## فایل‌های مهم

- `dist/direct-import/` — قالب‌های آمادهٔ Import (روش اصلی)
- `dist/kit/` — بستهٔ Website Kit برای Elementor › Tools › Import/Export Kit
- `dist/zips/` — سه بستهٔ ZIP برای جابه‌جایی
- `docs/TEMPLATE-MAP.csv` — نقشهٔ کامل قالب‌ها
- `docs/VALIDATION-REPORT.md` — گزارش اعتبارسنجی
- `docs/UNRESOLVED-INTEGRATIONS.md` — مواردی که باید پیش از انتشار حل شوند
- `docs/RESPONSIVE-QA.md` — چک‌لیست بررسی واکنش‌گرایی
- `backend/` — کد PHP مورد نیاز شورتکدها، CPTها و فیلدهای ACF

## بازسازی خروجی

```bash
node generator.mjs         # ساخت خروجی
node tools/validate.mjs    # اعتبارسنجی
node tools/build-docs.mjs  # تولید مستندات
node tools/build-zip.mjs   # ساخت بسته‌های ZIP
node tools/analyze-export.mjs <export.zip>   # اتصال به اکسپورت واقعی سایت
node tools/qa-import.mjs <export-after-import.zip>  # بررسی import روی استیج
```
