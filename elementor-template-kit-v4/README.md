# کیت حرفه‌ای Elementor اسدزاده — V4

این فولدر یک خروجی مستقل و قابل بازتولید از کیت Elementor است. خروجی Website Kit در `dist/asadzadeh-elementor-v4.zip` و خروجی Saved Templates در `dist/asadzadeh-elementor-v4-direct-import.zip` ساخته می‌شود.

## محتوا

- ۵۶ تمپلیت غیرخالی، شامل ۴ Loop Item داینامیک
- Header و Footer
- صفحات Public، Student، Auth و System
- Single templateهای LearnDash، WooCommerce و Blog
- ویجت‌های واقعی Element Pack Pro: Advanced Button، Advanced Heading، Interactive Card و Dynamic Grid
- فرم حرفه‌ای Elementor Pro و جایگاه نقشه نشان در صفحه تماس
- Loop item برای دوره، محصول، مقاله و اثر هنرجو
- Site Settings و Design Tokens فارسی/RTL
- بدون فایل فونت داخل ZIP
- سازگاری افزونه‌ها و shortcodeهای رسمی مطابق `COMPATIBILITY.md`

## نصب

1. Elementor، Elementor Pro و Element Pack Pro را فعال کنید.
2. برای قابلیت‌های واقعی، WooCommerce، LearnDash و Digits را نصب/فعال کنید.
3. ZIP اصلی را از مسیر Elementor > Tools > Import/Export Kit وارد کنید. اگر میزبان شما Website Kit را نمی‌پذیرد، ZIP نوع Direct Import را از Templates > Saved Templates > Import Templates وارد کنید.
4. Display Conditions قالب‌های Header/Footer و Singleها را تنظیم کنید.
5. فونت‌های Neirizi و Peyda را در Elementor Custom Fonts با همین نام ثبت کنید.

## ساخت مجدد

```powershell
node generator.mjs
node validate.mjs
Compress-Archive -Path dist\kit\* -DestinationPath dist\asadzadeh-elementor-v4.zip -Force
Compress-Archive -Path dist\direct-import\* -DestinationPath dist\asadzadeh-elementor-v4-direct-import.zip -Force
```

جزئیات اتصال shortcodeها و شرایط نمایش در `INSTALL.md` آمده است.
