# Asadzadeh Elementor Template Kit V4

## Product goal

این کیت برای تبدیل وردپرس به یک تجربه یکپارچه آموزش هنر، کلاس حضوری، فروشگاه و پنل هنرجو طراحی شده است. کاربر باید بتواند مسیر مناسب را پیدا کند، دوره یا کلاس را بخرد، درس را ادامه دهد و وضعیت سفارش/تکلیف/گواهی را بدون گم‌شدن ببیند.

## Information architecture

- Public: خانه، درباره، تماس، دوره‌ها، مسیرها، کلاس‌ها، مدرس‌ها، آثار، بلاگ، فروشگاه و صفحات حقوقی
- Student: داشبورد، دوره‌ها، کلاس‌ها، تکالیف، گواهی‌ها، سفارش‌ها و پروفایل
- Auth: ورود، ثبت‌نام، تأیید رمز یک‌بارمصرف، بازیابی و خطا
- System: پرداخت موفق/ناموفق، جست‌وجو، ۴۰۴ و خطای عمومی
- Theme builder: سربرگ، پابرگ، Singleهای LearnDash/WooCommerce/Blog و Loop itemها

## Visual direction

- رنگ‌ها: `#F3E9D6` زمینه، `#FFF8EC` سطح، `#193B5C` سرمه‌ای، `#9D382C` آجری، `#2F8C87` فیروزه‌ای، `#45423D` متن
- تایپ: Neirizi برای عنوان‌های نمایشی و Peyda برای متن/کنترل؛ fallback استاندارد فارسی در صورت نصب‌نبودن فونت
- فرم: گوشه‌های 14px برای کنترل‌ها و 20px برای سطوح اصلی؛ سایه فقط برای پنل‌های شناور
- امضای بصری: خط بافت‌مانند قالی در ابتدای سکشن‌ها و قاب‌های تصویری کنترل‌شده، بدون تزئینات تکراری

## Homepage architecture

صفحه اصلی از نظر بلوغ محصول از الگوی سایت‌های آموزشی موفق الهام گرفته است، بدون کپی بصری: معرفی کوتاه، اعتماد اجتماعی، انتخاب نقطه شروع، دوره‌های زنده LearnDash، مسیر یادگیری، کارگاه حضوری، مدرس‌ها، مجله داینامیک و CTA نهایی. هر بخش نقش متفاوتی در تصمیم کاربر دارد و دیگر تکرار یک Hero یا چند کارت هم‌شکل نیست.

## Layout plan

```text
Desktop:  [header........................................]
          [copy................][visual / action panel...]
          [section title.................................]
          [content grid / plugin mount...................]

Mobile:   [compact header]
          [copy]
          [visual/action]
          [single-column content]
          [full-width primary action]
```

## Component tree

```text
TemplateKit
  SiteHeader
  PublicPages
    PageHero
    PatternDivider
    ContentGrid
    PluginMount
    FinalCTA
  StudentPages
    DashboardShell
    StatusSummary
    ContentList
    EmptyState
  AuthPages
    AuthIntro
    DigitsMount
    RecoveryHint
  CommercePages
    WooCommerceMount
    PaymentState
  DynamicTemplates
    PostHeader
    DynamicContent
    RelatedContent
  SiteFooter
```

## State coverage

وضعیت‌های populated، loading، empty، error، disabled، focus-visible، hover و success در CSS و قالب‌های مستقل پوشش داده شده‌اند. Mountهای افزونه‌ها shortcode واقعی دارند و متن راهنما تنها برای زمانی نمایش داده می‌شود که افزونه یا داده هنوز آماده نیست.

## Responsive strategy

- زیر 767px همه گریدها تک‌ستونه، CTAها تمام‌عرض و اندازه عنوان‌ها محدود می‌شوند.
- 768 تا 1024px گریدهای سه‌ستونه دو ستونه می‌شوند و hero نسبت متعادل‌تری می‌گیرد.
- دسکتاپ روی عرض 1240px محدود است تا طول خط و خوانایی فارسی حفظ شود.

## Critical self-review

| ریسک | اصلاح |
|---|---|
| تبدیل همه محتوا به کارت | بیشتر بخش‌ها با فاصله و divider گروه‌بندی شده‌اند؛ کارت فقط برای شیء مستقل است |
| وابستگی به افزونه ناشناخته | فقط widgetهای واقعی مشاهده‌شده در نصب مبنا استفاده شده‌اند و Element Pack Pro صریحاً به‌عنوان dependency ثبت شده است |
| تکراری‌شدن ۴۰ صفحه | خانواده‌های visual، learning، commerce، dashboard، auth و editorial چیدمان‌های متفاوت دارند |
| خراب‌شدن RTL در موبایل | جهت RTL در ریشه و breakpointهای مستقل روی grid/actionها اعمال شده است |
| خروجی نمایشی ولی غیرقابل اتصال | هر صفحه dynamic یک Plugin Mount مشخص و راهنمای Display Condition دارد |
