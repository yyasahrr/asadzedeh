# موارد حل‌نشده و نیازمند تصمیم

این فایل تعمداً صریح است: هرچه اینجا آمده هنوز **تأیید نشده** و نباید
«انجام‌شده» فرض شود.

## ۱. عدم اتکا به اکسپورت واقعی

❌ هنوز هیچ اکسپورت واقعی از وردپرس/المنتور تحلیل نشده است. تنظیمات ویجت‌ها
محافظه‌کارانه و بر اساس کنترل‌های شناخته‌شدهٔ المنتور است، اما **تست import واقعی
انجام نشده**. برای رفع این مورد:

```bash
node tools/analyze-export.mjs <export.zip>
node generator.mjs
```

سپس روی استیج import کنید و خروجی را با `tools/qa-import.mjs` بررسی کنید.

## ۲. ویجت‌های استفاده‌شده که schema آن‌ها تأیید نشده

| ویجت | افزونه | ریسک | توضیح |
|---|---|---|---|
| `bdt-advanced-button` | bdthemes-element-pack-pro | medium | نیازمند تأیید روی نصب واقعی |
| `bdt-advanced-heading` | bdthemes-element-pack-pro | medium | نیازمند تأیید روی نصب واقعی |
| `bdt-interactive-card` | bdthemes-element-pack-pro | medium | نیازمند تأیید روی نصب واقعی |
| `woocommerce-product-price` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |
| `bdt-dynamic-grid` | bdthemes-element-pack-pro | medium | template_id must be reselected after import |
| `woocommerce-product-images` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |
| `woocommerce-product-add-to-cart` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |
| `woocommerce-product-data-tabs` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |
| `woocommerce-product-related` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |
| `bdt-advanced-image-gallery` | bdthemes-element-pack-pro | medium | نیازمند تأیید روی نصب واقعی |
| `woocommerce-product-title` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |
| `woocommerce-product-rating` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |
| `woocommerce-product-stock` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |
| `woocommerce-product-meta` | elementor-pro | medium | نیازمند تأیید روی نصب واقعی |

## ۳. شورتکدهایی که باید روی سایت بررسی شوند

| شورتکد | افزونه | هدف |
|---|---|---|
| `[dm-page]` | digits | فرم ورود/ثبت‌نام یکپارچه Digits |
| `[dm-login-page]` | digits | فرم ورود Digits |
| `[dm-forgot-password-page]` | digits | بازیابی رمز Digits |

> دربارهٔ Digits: اگر نسخهٔ نصب‌شده شورتکد متفاوتی ارائه می‌دهد یا مرحلهٔ OTP را
> داخل همان فرم مدیریت می‌کند، شورتکد را جایگزین کنید و قالب `otp` را به جریان
> اصلی متصل نکنید (مادهٔ ۲۴).

## ۴. قالب‌های نیازمند بک‌اند سفارشی

این قالب‌ها بدون فایل‌های `backend/` کار نمی‌کنند:

- **verify.json** — استعلام گواهی: فرم استعلام با nonce
- **single-course.json** — تک‌دوره — LearnDash: عنوان/خلاصه/تصویر شاخص + az_course_* 
- **lesson.json** — درس: محتوای درس + az_course_curriculum
- **enrolled-course.json** — پخش‌کنندهٔ دوره (در حال یادگیری): course_content + az_course_curriculum
- **learning-path-single.json** — تک‌مسیر یادگیری: ACF path_courses / outcomes / faq
- **class-single.json** — تک‌کلاس حضوری: ویجت‌های ووکامرس + az_workshop_meta
- **dashboard.json** — داشبورد هنرجو: az_dashboard_stats / az_continue_learning / az_my_courses
- **my-courses.json** — دوره‌های من: az_my_courses
- **my-classes.json** — کلاس‌های حضوری من: az_my_workshops
- **assignments.json** — تکالیف: az_assignments
- **certificates.json** — گواهی‌های من: az_my_certificates
- **certificate-single.json** — جزئیات گواهی: az_certificate_detail
- **orders.json** — سفارش‌های من: az_my_orders
- **order-detail.json** — جزئیات سفارش: az_order_detail
- **profile.json** — پروفایل: az_profile_form
- **account-security.json** — امنیت حساب: تغییر شماره و رمز از طریق Digits
- **order-tracking.json** — پیگیری سفارش: az_order_tracking
- **preorder.json** — پیش‌خرید / لیست انتظار: az_preorder_form
- **no-results.json** — بدون نتیجه: az_no_results

## ۵. قالب‌های نیازمند محتوای واقعی

15 قالب دارای متغیرهای `REPLACE:` هستند (تلفن، نشانی،
قیمت، تاریخ، نام مدرسان). این مقادیر **عمداً** ساختگی نیستند.

## ۶. محدودیت‌های محیط توسعه

- دسترسی به `asadzadehacademy.ir` از محیط ساخت مسدود است؛ بنابراین
  **تست import واقعی (مادهٔ ۴۵) انجام نشده** و باید روی استیج انجام شود.
- نصب محلی وردپرس با Elementor Pro در این محیط ممکن نیست (نیازمند لایسنس).
- ریسپانسیو با overrideهای نیتیو و CSS بررسی شده، اما **تست بصری روی دستگاه واقعی**
  هنوز انجام نشده است؛ چک‌لیست در `RESPONSIVE-QA.md`.
- آمارها عمداً ساختگی نیستند: `[az_dashboard_stats]` در صورت نبود داده، مقدار
  صفر یا وضعیت خالی نشان می‌دهد و هرگز عدد تزیینی چاپ نمی‌کند.
