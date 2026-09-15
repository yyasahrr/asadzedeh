# ماتریس سازگاری V4.0

## اصل سازگاری

ساختار پایه با Containerهای Elementor ساخته شده، اما نسخه V4 برای کیفیت رابط از چند ویجت واقعی و بررسی‌شده Element Pack Pro استفاده می‌کند. بنابراین Element Pack Pro در این نسخه الزامی است؛ افزونه‌های دیگر فقط جایی الزامی‌اند که داده همان سرویس نمایش داده می‌شود.

| افزونه | روش اتصال | وضعیت نبود افزونه |
|---|---|---|
| Elementor 4.2.3 | Container، Heading، Text، Button، Shortcode | افزونه اصلی و الزامی |
| Elementor Pro 4.2.2 | Theme Post Title/Content، Search، Product widgets، Theme Builder | قالب‌های Single و Search نیازمند Pro هستند |
| Element Pack Pro 9.9.1 | Advanced Button، Advanced Heading، Interactive Card، Dynamic Grid | برای نمایش صحیح دکمه‌ها، ورودی مسیر و آرشیوهای داینامیک الزامی است |
| LearnDash 4.20 | shortcodeهای رسمی و محتوای پویا | فقط mount مربوط خالی یا متن shortcode دیده می‌شود؛ باقی صفحه سالم است |
| LearnDash Elementor | امکان جایگزینی mount با widgetهای بصری LearnDash | اختیاری |
| LearnDash Certificate Builder | صفحه فهرست/نمایش گواهی آماده اتصال است | اختیاری |
| LearnDash WooCommerce | فروش دوره به‌صورت Product | اختیاری؛ طراحی WooCommerce مستقل باقی می‌ماند |
| WooCommerce 11.1 | shortcodeهای رسمی و Product widgets | صفحات محتوایی سالم؛ بخش فروشگاهی نیازمند WooCommerce است |
| WooCommerce فارسی | تبدیل متن/واحد/نشانی در لایه افزونه | اختیاری و بدون override مخرب |
| Digits 9.2 | `[dm-page]`، `[dm-login-page]`، `[dm-forgot-password-page]` | صفحه Auth سالم و mount فرم غیرفعال می‌ماند |
| Elementor فارسی | فونت/اعداد و ابزارهای ویرایش | اختیاری |
| Premium Addons | CSS سازگار برای `.premium-*` بدون widget اجباری | اختیاری |
| ACF Pro | قابل استفاده برای Dynamic Tags | اختیاری؛ فیلد اجباری در export وجود ندارد |
| Neshan Map | widget نقشه در صفحه تماس | ویجت در قالب وجود دارد؛ کلید API عمداً خالی است و باید پس از Import تنظیم شود |
| Code Snippets / WPCode | مناسب افزودن bridgeهای سفارشی | اختیاری |

## shortcodeهای استفاده‌شده

- LearnDash: `[ld_course_list]`, `[ld_profile]`, `[course_content]`, `[learndash_course_progress]`
- WooCommerce: `[products]`, `[woocommerce_cart]`, `[woocommerce_checkout]`, `[woocommerce_my_account]`
- Digits: `[dm-page]`, `[dm-login-page]`, `[dm-forgot-password-page]`

## نکته Cart و Checkout

این کیت از shortcodeهای کلاسیک Cart و Checkout استفاده می‌کند، زیرا داخل Elementor و در حضور افزونه‌های جانبی سازگاری گسترده‌تری دارند. اگر سایت از WooCommerce Blocks استفاده می‌کند، هر دو صفحه Cart و Checkout را با هم به Block تبدیل کنید؛ ترکیب یک صفحه Block و یک صفحه Shortcode توصیه نمی‌شود.

## مواردی که عمداً استفاده نشده‌اند

- shortcode جعلی یا وابسته به افزونه نصب‌نشده
- `product_page id="current"`
- `[ld_course_content]`
- `[learndash_user_course_progress]`
- `[wpdreams_ajaxsearchlite]`
- `[display-posts]`
- تصویر یا فونت خارجی که Importer مجبور به دانلود آن باشد
