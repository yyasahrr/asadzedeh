# نقشهٔ شورتکدها

هر شورتکدی که در خروجی استفاده شده باید اینجا تعریف شده باشد؛ در غیر این صورت
ولیدیتور خطا می‌دهد (الزام مادهٔ ۲۴: اختراع شورتکد بدون بررسی ممنوع).

| شورتکد | منبع | تأییدشده | هدف | پارامترها | استفاده در |
|---|---|---|---|---|---|
| `[woocommerce_cart]` | woocommerce | بله | سبد خرید کامل WooCommerce | — | cart |
| `[woocommerce_checkout]` | woocommerce | بله | فرم تسویه‌حساب WooCommerce | — | checkout، checkout-error |
| `[woocommerce_my_account]` | woocommerce | بله | حساب کاربری و endpointهای WooCommerce | — | my-account |
| `[woocommerce_order_tracking]` | woocommerce | بله | پیگیری سفارش | — | order-tracking |
| `[products]` | woocommerce | بله | گرید محصولات/دوره‌ها | limit, columns, category, orderby, order, ids, paginate | workshops، shop |
| `[ld_course_list]` | learndash-lms | بله | فهرست دوره‌ها | num, orderby, order, category, tag, mycourses, status, show_thumbnail, progress_bar, col, course_grid, price | home، courses |
| `[course_content]` | learndash-lms | بله | محتوای دوره (۱۰۰٪ در Single Course) | course_id, field | single-course، quiz |
| `[learndash_course_progress]` | learndash-lms | بله | نوار پیشرفت دورهٔ کاربر | course_id, user_id, array | single-course، lesson، topic، enrolled-course |
| `[dm-page]` | digits | خیر — باید روی سایت بررسی شود | فرم ورود/ثبت‌نام یکپارچه Digits | login, signup | auth، otp |
| `[dm-login-page]` | digits | خیر — باید روی سایت بررسی شود | فرم ورود Digits | — | auth-error |
| `[dm-forgot-password-page]` | digits | خیر — باید روی سایت بررسی شود | بازیابی رمز Digits | — | recovery |
| `[az_dashboard_stats]` | backend/ این کیت | بله | کاشی‌های آمار واقعی داشبورد (بدون عدد ساختگی) | — | dashboard، my-courses |
| `[az_continue_learning]` | backend/ این کیت | بله | کارت ادامه یادگیری بر اساس آخرین درس باز شده | — | dashboard |
| `[az_my_courses]` | backend/ این کیت | بله | دوره‌های من با درصد پیشرفت واقعی | limit, status | dashboard، my-courses |
| `[az_my_workshops]` | backend/ این کیت | بله | کلاس‌های حضوری خریداری‌شده | — | my-classes |
| `[az_assignments]` | backend/ این کیت | بله | تکالیف با وضعیت واقعی (جدید/ارسال‌شده/تأیید/نیاز به بازنگری) | course_id | dashboard، assignments |
| `[az_my_certificates]` | backend/ این کیت | بله | گواهی‌های صادرشده برای کاربر | — | dashboard، certificates |
| `[az_certificate_verify]` | backend/ این کیت | بله | فرم عمومی استعلام گواهی با nonce | — | verify |
| `[az_course_curriculum]` | backend/ این کیت | بله | سرفصل درختی دوره با وضعیت قفل/رایگان/تکمیل | course_id | lesson، enrolled-course |
| `[az_course_cta]` | backend/ این کیت | بله | دکمهٔ خرید/ادامه بر اساس وضعیت ثبت‌نام واقعی | course_id | single-course، lesson |
| `[az_course_meta]` | backend/ این کیت | بله | متادادهٔ واقعی دوره (سطح، جلسات، مدت) | field, course_id | single-course، loop-course |
| `[az_workshop_meta]` | backend/ این کیت | بله | ظرفیت/تاریخ/جلسات کلاس حضوری از موجودی محصول | field, product_id | contact، class-single |
| `[az_instructor_courses]` | backend/ این کیت | بله | دوره‌های یک مدرس (ACF relationship) | instructor_id | single-instructor |
| `[az_path_courses]` | backend/ این کیت | بله | توالی دوره‌های یک مسیر یادگیری | path_id | learning-paths، learning-path-single |
| `[az_related_courses]` | backend/ این کیت | بله | دوره‌های مرتبط بر اساس دسته | limit | single-course |
| `[az_order_tracking]` | backend/ این کیت | بله | پیگیری سفارش با nonce | — | order-tracking |
| `[az_preorder_form]` | backend/ این کیت | بله | فرم پیش‌خرید/لیست انتظار | product_id | preorder |
| `[az_no_results]` | backend/ این کیت | بله | پیشنهادهای جایگزین هنگام نبود نتیجهٔ جست‌وجو | — | no-results |
| `[az_my_orders]` | backend/ این کیت | بله | جدول سفارش‌های کاربر با وضعیت واقعی | limit | dashboard، orders |
| `[az_order_detail]` | backend/ این کیت | بله | جزئیات یک سفارش با بررسی مالکیت | order_id | order-detail |
| `[az_certificate_detail]` | backend/ این کیت | بله | جزئیات یک گواهی با بررسی مالکیت | cert_id | certificate-single |
| `[az_assignment_upload]` | backend/ این کیت | بله | فرم ارسال تکلیف با nonce و بررسی مجوز | course_id, lesson_id | assignments |
| `[az_profile_form]` | backend/ این کیت | بله | فرم ویرایش پروفایل با nonce | — | profile |
| `[az_security_sessions]` | backend/ این کیت | بله | نشست‌های فعال کاربر (در صورت پشتیبانی) | — | account-security |
| `[az_search_results]` | backend/ این کیت | بله | نتایج جست‌وجو با وضعیت بدون نتیجه | — | search |

## شورتکدهای تعریف‌شده اما استفاده‌نشده

- `[product_categories]` — فهرست دسته‌های محصول
- `[ld_profile]` — پروفایل و پیشرفت هنرجو
- `[ld_certificate]` — لینک گواهی دوره
- `[usercourseinfo]` — خلاصه دوره‌های کاربر
- `[ld_lesson_list]` — فهرست درس‌های یک دوره
- `[ld_topic_list]` — فهرست موضوع‌های یک درس
- `[dm-signup-page]` — فرم ثبت‌نام Digits
