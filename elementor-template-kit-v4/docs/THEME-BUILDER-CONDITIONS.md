# شرایط نمایش Theme Builder

نوع سند هر قالب یک **نوع واقعی المنتور** است؛ شرط نمایش پس از Import باید
طبق این جدول تنظیم شود.

| قالب | نوع سند | شرط نمایش |
|---|---|---|
| header.json | `header` | Theme Builder → Header → Entire Site |
| footer.json | `footer` | Theme Builder → Footer → Entire Site |
| section-hero.json | `section` | ندارد (درج دستی در صفحات) |
| section-cta.json | `section` | ندارد (درج دستی در صفحات) |
| section-empty-state.json | `section` | ندارد (درج دستی در صفحات) |
| section-trust.json | `section` | ندارد (درج دستی در صفحات) |
| home.json | `page` | تنظیم به‌عنوان صفحهٔ اصلی وردپرس |
| single-artwork.json | `single` | Theme Builder → Single → Artwork (az_artwork) |
| single-post.json | `single` | Theme Builder → Single → Posts |
| single-instructor.json | `single` | Theme Builder → Single → Instructor |
| single-course.json | `single` | Theme Builder → Single → Courses (sfwd-courses) |
| lesson.json | `single` | Theme Builder → Single → Lessons (sfwd-lessons) |
| topic.json | `single` | Theme Builder → Single → Topics (sfwd-topic) |
| quiz.json | `single` | Theme Builder → Single → Quizzes (sfwd-quiz) |
| learning-path-single.json | `single` | Theme Builder → Single → Learning Path |
| class-single.json | `product` | Theme Builder → Single Product → In Product Category: workshop |
| shop.json | `product-archive` | Theme Builder → Products Archive → All Products |
| single-product.json | `product` | Theme Builder → Single Product → All Products |
| loop-course.json | `loop-item` | در Loop Grid یا Dynamic Grid مربوط به دوره‌ها انتخاب شود |
| loop-product.json | `loop-item` | در گرید محصولات انتخاب شود |
| loop-post.json | `loop-item` | در گرید نوشته‌ها انتخاب شود |
| loop-artwork.json | `loop-item` | در Dynamic Grid آثار انتخاب شود |
| loop-instructor.json | `loop-item` | در Dynamic Grid مدرسان انتخاب شود |

## قالب‌هایی که شرط ندارند (صفحات عادی)

- start-here.json — از کجا شروع کنم؟ (/start-here)
- about.json — دربارهٔ کارگاه (/about)
- contact.json — تماس با ما (/contact)
- works.json — آثار هنرجویان (/works)
- blog.json — مجله (/blog)
- instructors.json — مدرسان (/instructors)
- gallery.json — گالری کارگاه (/gallery)
- faq.json — پرسش‌های پرتکرار (/faq)
- support.json — پشتیبانی (/support)
- verify.json — استعلام گواهی (/verify)
- privacy.json — حریم خصوصی (/privacy)
- terms.json — شرایط استفاده (/terms)
- rules.json — قوانین دوره و کلاس (/rules)
- refund.json — شرایط بازگشت وجه (/refund)
- shipping.json — ارسال و تحویل (/shipping)
- courses.json — دوره‌های آنلاین — فهرست (/courses)
- enrolled-course.json — پخش‌کنندهٔ دوره (در حال یادگیری) (/learn/{course})
- learning-paths.json — مسیرهای یادگیری — فهرست (/learning-paths)
- workshops.json — کلاس‌های حضوری — فهرست (/workshops)
- dashboard.json — داشبورد هنرجو (/dashboard)
- my-courses.json — دوره‌های من (/dashboard/courses)
- my-classes.json — کلاس‌های حضوری من (/dashboard/classes)
- assignments.json — تکالیف (/dashboard/assignments)
- certificates.json — گواهی‌های من (/dashboard/certificates)
- certificate-single.json — جزئیات گواهی (/dashboard/certificates/{id})
- orders.json — سفارش‌های من (/dashboard/orders)
- order-detail.json — جزئیات سفارش (/dashboard/orders/{id})
- profile.json — پروفایل (/dashboard/profile)
- account-security.json — امنیت حساب (/dashboard/security)
- cart.json — سبد خرید (/cart)
- cart-empty.json — سبد خرید — خالی (/cart)
- checkout.json — تسویه‌حساب (/checkout)
- checkout-error.json — تسویه‌حساب — خطا (/checkout)
- payment-success.json — پرداخت موفق (/checkout/success)
- payment-failed.json — پرداخت ناموفق (/checkout/failed)
- my-account.json — حساب کاربری (/my-account)
- order-tracking.json — پیگیری سفارش (/order-tracking)
- preorder.json — پیش‌خرید / لیست انتظار (/preorder)
- auth.json — ورود / ثبت‌نام (/auth)
- otp.json — تأیید کد یک‌بارمصرف (/auth/verify)
- recovery.json — بازیابی حساب (/auth/recovery)
- auth-error.json — خطای ورود (/auth/error)
- search.json — جست‌وجو (/search)
- no-results.json — بدون نتیجه (/search)
- not-found.json — صفحهٔ ۴۰۴ (/404)
- generic-error.json — خطای عمومی (/error)
- maintenance.json — در دست تعمیر (/maintenance)

## نکات مهم

- سربرگ و پابرگ روی **Entire Site** تنظیم شوند.
- قالب `class-single` (کلاس حضوری) باید **اولویت بالاتری** از `single-product`
  داشته باشد و روی دستهٔ `workshop` شرط بخورد.
- Loop Itemها فقط زمانی دیده می‌شوند که در یک Loop Grid یا Dynamic Grid انتخاب شوند.
- برای دوره‌ها، درس‌ها، موضوع‌ها و آزمون‌ها از نوع سند `single` با شرط
  **Singular › Courses/Lessons/Topics/Quizzes** استفاده کنید (نه نوع سند اختصاصی).
- صفحاتی که نیازمند محدودیت دسترسی هستند (پنل هنرجو) را با افزونهٔ محدودسازی
  یا کد سفارشی محدود کنید؛ المنتور به‌تنهایی دسترسی را کنترل نمی‌کند.
