# کیت المنتور آکادمی اسدزاده — V5

مستندات کامل: **[docs/README-FA.md](docs/README-FA.md)**

## ساختار

```
elementor-template-kit-v4/
  generator.mjs          ساخت خروجی (node generator.mjs)
  src/                   مولّد: توکن‌ها، CSS، DOM، schema، محتوا، بخش‌ها، صفحات
  dist/
    direct-import/       ۷۰ قالب JSON برای Import مستقیم  ← روش اصلی
    kit/                 بستهٔ Website Kit (ثانویه)
    zips/                سه بستهٔ ZIP (ساخته می‌شود، در گیت نیست)
  backend/               کد PHP مورد نیاز (شورتکدها، CPTها، فیلدهای ACF)
  docs/                  نقشهٔ قالب‌ها، گزارش اعتبارسنجی، شرایط Theme Builder و...
  reference/
    incoming/            ← خروجی واقعی المنتور سایت را اینجا بگذارید
  tools/                 تحلیل اکسپورت، اعتبارسنجی، تولید مستندات، ZIP، بررسی import
  legacy/                کیت V4 قدیمی (فقط برای مرجع)
```

## ترتیب اجرا

```bash
node generator.mjs                 استخراج ۷۰ قالب
node tools/validate.mjs            اعتبارسنجی سخت‌گیرانه
node tools/build-docs.mjs          تولید مستندات
node tools/build-zip.mjs           ساخت بسته‌های ZIP
```

با داشتن خروجی واقعی سایت:

```bash
node tools/analyze-export.mjs reference/incoming/<export.zip>
node generator.mjs
```

پس از import روی استیج:

```bash
node tools/qa-import.mjs <export-after-import.zip>
```

## وضعیت فعلی

- ۷۰ قالب، ۳۳۵۰ المان، ۱۴۸۸ ویجت، ۱۱۵۸ override ریسپانسیو
- صفر المان بدون عنوان · صفر خطا و صفر هشدار در اعتبارسنجی
- ۲۴ شورتکد سفارشیِ پیاده‌سازی‌شده در `backend/`
- بدون فایل فونت، بدون `__globals__`، بدون overwrite تنظیمات سراسری

موارد باقی‌مانده در **[docs/UNRESOLVED-INTEGRATIONS.md](docs/UNRESOLVED-INTEGRATIONS.md)**
به‌طور صریح فهرست شده‌اند؛ مهم‌ترین آن‌ها این است که **تست import واقعی هنوز
انجام نشده** و نیازمند اکسپورت واقعی سایت شماست.
