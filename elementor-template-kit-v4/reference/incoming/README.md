# محل قرار دادن اکسپورت واقعی وردپرس/المنتور

این پوشه محل رها کردن خروجی واقعی سایت است تا کیت به‌جای حدس، روی
تنظیمات واقعی نصب شما سوار شود (مادهٔ ۳ و ۵۱).

## چه چیزی اینجا بگذارید؟

بهترین حالت — **خروجی کامل کیت**:
پیشخوان وردپرس › Elementor › Tools › Import/Export Kit › Export
(فایل ZIP خروجی را همین‌جا رها کنید)

حالت خوب — **چند Saved Template**:
پیشخوان › Templates › Saved Templates › هر قالب › Export (JSON)
(چند فایل JSON را همین‌جا رها کنید)

همچنین مفید است: خروجی یک قالب Theme Builder (سربرگ یا Single) و یک قالب
حاوی فرم Digits.

## بعد از قرار دادن فایل

```bash
cd elementor-template-kit-v4
node tools/analyze-export.mjs reference/incoming/<your-file.zip>
node generator.mjs
node tools/validate.mjs
node tools/build-docs.mjs
```

اسکریپت اول سه فایل می‌سازد:

- `reference/schemas.json` — تنظیمات واقعی هر ویجت
- `reference/export-analysis.md` — گزارش تحلیل (چه ویجت‌هایی روی سایت نصب است)
- `reference/unverified.json` — ویجت‌هایی که کیت استفاده می‌کند اما اکسپورت تأیید نکرده

وقتی `reference/schemas.json` وجود داشته باشد، مولّد به‌طور خودکار تنظیمات واقعی
را **زیر** تنظیمات ما می‌نشاند (`schemaGroundedOnRealExport: true` در خروجی).

`__globals__`، `custom_css` و `template_id` از schemaهای استخراج‌شده حذف
می‌شوند تا هیچ تنظیم سراسری یا ارجاع شکسته‌ای وارد کیت نشود.

## نکتهٔ حریم خصوصی

این پوشه در `.gitignore` است؛ اکسپورت خام شما به گیت اضافه نمی‌شود.
فقط فایل‌های تحلیل‌شده (`schemas.json` و `export-analysis.md`) در صورت نیاز
قابل کامیت هستند و آن‌ها هم حاوی دادهٔ شخصی نیستند.
