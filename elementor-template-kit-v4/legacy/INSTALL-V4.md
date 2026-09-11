# راهنمای اتصال

## افزونه‌ها

- Elementor / Elementor Pro: چیدمان، Theme Builder و Custom CSS
- Element Pack Pro: دکمه‌های اصلی، heading کمکی، کارت‌های تعاملی و Dynamic Grid
- LearnDash: دوره، درس، موضوع، آزمون، پروفایل و محتوای هنرجو
- WooCommerce: فروشگاه، سبد، پرداخت، حساب و سفارش‌ها
- Digits: ورود، ثبت‌نام و OTP با shortcode `[dm-page]`

## Display Conditions

- Header و Footer: Entire Site
- Single Course / Lesson / Topic / Quiz: نوع نوشته متناظر LearnDash
- Single Product: All Products
- Single Post: All Posts

## نگاشت صفحات

- صفحات archive را به برگه وردپرس متصل کنید و shortcode یا Query Loop موردنظر را جایگزین داده نمونه کنید.
- دسته کلاس حضوری در WooCommerce با slug برابر `workshop` در نظر گرفته شده است.
- فرم تماس از widget واقعی Elementor Pro استفاده می‌کند؛ Action After Submit، ایمیل و CRM را با اطلاعات واقعی سایت تنظیم کنید.
- در widget نقشه نشان صفحه تماس، کلید API عمداً خالی است؛ کلید دامنه خودتان را وارد کنید.
- Loop Itemهای Blog و Artwork را در Dynamic Gridهای Element Pack Pro بررسی و در صورت تفاوت شناسه بعد از Import دوباره انتخاب کنید.
- صفحه تأیید گواهی به backend افزونه گواهی نیاز دارد؛ Elementor فقط UI را فراهم می‌کند.

## فونت

فایل فونت عمداً در ZIP نیست. در Elementor > Custom Fonts دو family با نام دقیق `Neirizi` و `Peyda` بسازید.
