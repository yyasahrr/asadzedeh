# نقشهٔ فیلدهای داینامیک (مادهٔ ۳۲ و ۳۳)

## آنچه در قالب‌ها داینامیک است

| قالب | منبع داینامیک | نحوهٔ اتصال |
|---|---|---|
| header.json | لوگو و منوی سایت از تنظیمات وردپرس | پس از Import: ویجت Nav Menu را باز کنید و منوی اصلی سایت را انتخاب کنید. لوگو در صورت نبود site logo، تصویر جایگزین قرار دهید. |
| footer.json | اطلاعات تماس از متن قالب | لینک‌های شبکه‌های اجتماعی و اطلاعات تماس را با مقادیر واقعی جایگزین کنید. |
| home.json | LearnDash course list + آخرین نوشته‌ها | تصویر Hero و تصاویر گالری را جایگزین کنید. |
| contact.json | فرم المنتور پرو (در صورت نصب افزونه نقشه: ویجت نقشه) | Action After Submit فرم و کلید API نقشه را تنظیم کنید. |
| works.json | Dynamic Grid روی CPT az_artwork | پس از Import، Loop Item اثر را در Dynamic Grid انتخاب کنید. |
| single-artwork.json | ACF: technique/materials/dimensions/gallery | فیلدهای ACF را در ویجت‌های مربوط انتخاب کنید. |
| blog.json | ویجت Posts | اگر از Theme Builder استفاده می‌کنید، الگوی آرشیو را به نوشته‌ها متصل کنید. |
| single-post.json | محتوای نوشته | پس از Import بررسی شود |
| instructors.json | Dynamic Grid روی CPT instructor | در صورت استفاده از CPT مدرس، Loop Item مربوط را انتخاب کنید. |
| single-instructor.json | ACF: specialty/experience/biography/featured_courses | فیلدهای ACF را متصل کنید. |
| verify.json | فرم استعلام با nonce | نیازمند backend/asadzadeh-kit-shortcodes.php |
| courses.json | ld_course_list | پس از Import بررسی شود |
| single-course.json | عنوان/خلاصه/تصویر شاخص + az_course_*  | قیمت، سطح و مدرس از طریق az_course_meta خوانده می‌شود؛ در صورت نبود فیلد، مقادیر REPLACE جایگزین کنید. |
| lesson.json | محتوای درس + az_course_curriculum | پس از Import بررسی شود |
| topic.json | محتوای موضوع | پس از Import بررسی شود |
| quiz.json | آزمون LearnDash | پس از Import بررسی شود |
| enrolled-course.json | course_content + az_course_curriculum | این صفحه باید به مسیر یادگیری LearnDash متصل شود. |
| learning-paths.json | CPT learning_path | در صورت نبود CPT، فهرست ثابت نمایش داده می‌شود. |
| learning-path-single.json | ACF path_courses / outcomes / faq | Slugهای فارسی باید با تنظیمات پیوند یکتا (UTF-8) بررسی شوند. |
| workshops.json | products category=workshop | دستهٔ محصول با slug دقیق workshop ایجاد شود. |
| class-single.json | ویجت‌های ووکامرس + az_workshop_meta | ظرفیت = موجودی محصول. |
| shop.json | woocommerce-archive-products | پس از Import بررسی شود |
| single-product.json | ویجت‌های ووکامرس | قالب کلاس حضوری اولویت بالاتری برای دستهٔ workshop دارد. |
| dashboard.json | az_dashboard_stats / az_continue_learning / az_my_courses | دسترسی این صفحه باید به کاربران واردشده محدود شود. |
| my-courses.json | az_my_courses | پس از Import بررسی شود |
| my-classes.json | az_my_workshops | پس از Import بررسی شود |
| assignments.json | az_assignments | ارسال فایل باید با تنظیمات تکلیف LearnDash هماهنگ شود. |
| certificates.json | az_my_certificates | پس از Import بررسی شود |
| certificate-single.json | az_certificate_detail | پس از Import بررسی شود |
| orders.json | az_my_orders | پس از Import بررسی شود |
| order-detail.json | az_order_detail | پس از Import بررسی شود |
| profile.json | az_profile_form | پس از Import بررسی شود |
| account-security.json | تغییر شماره و رمز از طریق Digits | فرم‌های تغییر شماره/رمز با shortcode واقعی Digits جایگزین شود. |
| cart.json | woocommerce_cart | پس از Import بررسی شود |
| checkout.json | woocommerce_checkout | سربرگ ساده‌شده برای کاهش حواس‌پرتی؛ هدر اصلی را غیرفعال کنید. |
| checkout-error.json | woocommerce_checkout | نمونهٔ خطاها برای بررسی ظاهری است. |
| payment-success.json | سفارش ووکامرس | این صفحه را به Thank You page ووکامرس متصل کنید. |
| my-account.json | woocommerce_my_account | پیوندها با پنل هنرجو یکسان شده است. |
| order-tracking.json | az_order_tracking | پس از Import بررسی شود |
| preorder.json | az_preorder_form | پس از Import بررسی شود |
| auth.json | dm-page | شورتکد Digits را با نسخهٔ نصب‌شده تطبیق دهید. |
| otp.json | همان فرم Digits (در صورت مدیریت داخلی OTP) | اگر Digits مرحلهٔ OTP را جداگانه ارائه نمی‌دهد، این صفحه را به جریان اصلی متصل نکنید. |
| recovery.json | dm-forgot-password-page | پس از Import بررسی شود |
| auth-error.json | dm-login-page | پس از Import بررسی شود |
| search.json | نتایج وردپرس | در صورت استفاده از قالب Search Results المنتور پرو، این صفحه را به آن متصل کنید. |
| no-results.json | az_no_results | پس از Import بررسی شود |
| loop-course.json | عنوان/خلاصه/تصویر + az_course_meta | پس از Import، این Loop Item را در ویجت گرید انتخاب کنید. |
| loop-product.json | عنوان/خلاصه/تصویر محصول | قیمت در صورت نیاز با ویجت Price به کارت اضافه شود. |
| loop-post.json | عنوان/خلاصه/تصویر نوشته | پس از Import بررسی شود |
| loop-artwork.json | عنوان/تصویر اثر + ACF technique | فیلد ACF تکنیک را در صورت نیاز اضافه کنید. |
| loop-instructor.json | نام/تصویر مدرس + ACF specialty | پس از Import بررسی شود |

## فیلدهای ACF پیشنهادی

### CPT `learning_path` — مسیر یادگیری
| فیلد | نوع | توضیح |
|---|---|---|
| `description` | Textarea | معرفی مسیر |
| `accent` | Select | navy / red / teal / cream |
| `duration` | Text | مدت کل |
| `path_courses` | Relationship (چندتایی) | توالی دوره‌ها — حتماً چندتایی باشد |
| `fixed_price` | Number | قیمت بسته |
| `discount` | Number | تخفیف واقعی (در صورت وجود) |
| `steps` | Repeater | مراحل |
| `outcomes` | Repeater | خروجی‌ها |
| `faq` | Repeater | پرسش‌ها |

### CPT `instructor` — مدرس
| فیلد | نوع | توضیح |
|---|---|---|
| `specialty` | Text | تخصص |
| `experience` | Text | تجربه (فقط در صورت تأیید) |
| `biography` | WYSIWYG | بیوگرافی |
| `profile_image` | Image | تصویر |
| `social_links` | Repeater | شبکه‌ها |
| `featured_courses` | Relationship | دوره‌های شاخص |

### CPT `az_artwork` — اثر
| فیلد | نوع | توضیح |
|---|---|---|
| `technique` | Text | تکنیک |
| `materials` | Text | مواد |
| `dimensions` | Text | ابعاد |
| `artist` | Text | هنرمند/هنرجو |
| `year` | Text | سال |
| `gallery` | Gallery | تصاویر |

## Shortcodeهای سفارشی که دادهٔ واقعی می‌خوانند

| شورتکد | دادهٔ واقعی | در صورت نبود داده |
|---|---|---|
| `[az_course_meta]` | سطح، مدت، جلسات، قیمت، مدرس، پیش‌نیاز | متن جایگزین نمایش داده می‌شود |
| `[az_course_cta]` | وضعیت ثبت‌نام کاربر در LearnDash | دکمهٔ خرید |
| `[az_course_curriculum]` | سرفصل واقعی با وضعیت قفل/رایگان/تکمیل | فهرست خالی |
| `[az_dashboard_stats]` | شمارش‌های واقعی از LearnDash/Woo | **هیچ عدد ساختگی نشان نمی‌دهد** |
| `[az_continue_learning]` | آخرین درس باز شده | وضعیت خالی |
| `[az_my_courses]` | دوره‌ها با درصد پیشرفت | وضعیت خالی |
| `[az_my_workshops]` | کلاس‌های خریداری‌شده | وضعیت خالی |
| `[az_assignments]` | تکالیف و وضعیت بررسی | وضعیت خالی |
| `[az_my_certificates]` / `[az_certificate_detail]` | گواهی‌های واقعی | وضعیت خالی |
| `[az_workshop_meta]` | موجودی محصول = ظرفیت، تاریخ، جلسات | متن جایگزین |
| `[az_path_courses]` | توالی دوره‌های مسیر | فهرست ثابت |
| `[az_related_courses]` | دوره‌های هم‌دسته | فهرست ثابت |
| `[az_my_orders]` / `[az_order_detail]` | سفارش‌های ووکامرس با بررسی مالکیت | وضعیت خالی |
| `[az_certificate_verify]` | استعلام عمومی با nonce | پیام «پیدا نشد» |
| `[az_order_tracking]` | پیگیری سفارش با nonce | پیام خطا |
| `[az_preorder_form]` | لیست انتظار | فرم جایگزین المنتور |
| `[az_profile_form]` | ویرایش پروفایل با nonce | فرم جایگزین المنتور |

## تگ‌های داینامیک المنتور

در Loop Itemها و قالب‌های Single از تگ‌های نیتیو استفاده شده است:
`post-title`، `post-excerpt`، `post-content`، `post-featured-image`، `post-url`.
هیچ مقداری در JSON هاردکد نشده است.
