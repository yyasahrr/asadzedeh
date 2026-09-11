# گزارش وابستگی به افزونه‌ها

این جدول از روی **ویجت‌های واقعاً استفاده‌شده** در خروجی تولید شده است، نه از یک فهرست دستی.

| افزونه | تعداد استفاده | ویجت‌ها |
|---|---|---|
| `elementor` | 1399 | `text-editor`، `heading`، `html`، `button`، `shortcode`، `icon-list`، `icon-box`، `accordion`، `search-form`، `testimonial`، `posts`، `divider`، `video`، `image` |
| `elementor-pro` | 50 | `theme-post-title`، `theme-post-excerpt`، `theme-post-featured-image`، `theme-post-content`، `form`، `woocommerce-product-price`، `woocommerce-product-images`، `woocommerce-product-add-to-cart`، `woocommerce-product-data-tabs`، `woocommerce-product-related`، `theme-site-logo`، `nav-menu`، `woocommerce-archive-products`، `woocommerce-product-title`، `woocommerce-product-rating`، `woocommerce-product-stock`، `woocommerce-product-meta` |
| `bdthemes-element-pack-pro` | 39 | `bdt-advanced-button`، `bdt-advanced-heading`، `bdt-interactive-card`، `bdt-dynamic-grid`، `bdt-advanced-image-gallery` |

## استفادهٔ عامدانه از Element Pack Pro (مادهٔ ۵)

| ویجت | کجا استفاده شده | چرا |
|---|---|---|
| `bdt-advanced-button` | دکمهٔ اصلی در باندهای دعوت به اقدام | آیکون و حالت hover بهتری نسبت به دکمهٔ معمولی دارد |
| `bdt-advanced-heading` | برچسب/eyebrow بالای سربرگ بخش‌ها | دقیقاً کاربرد «برچسب ادیتوریال»؛ هرگز برای H1/H2 استفاده نشده |
| `bdt-interactive-card` | کارت‌های مسیر یادگیری | مقایسهٔ چند مسیر با hover و badge واقعاً بهتر می‌شود |
| `bdt-dynamic-grid` | آثار هنرجویان و مدرسان | گرید داینامیک روی CPT |
| `bdt-advanced-image-gallery` | گالری کارگاه | لایت‌باکس و نسبت تصویر یکپارچه |

**عمداً استفاده نشده:**
- `bdt-advanced-counter` — فقط برای آمار واقعی مجاز است (مادهٔ ۵: «Never use fake
  statistics»). هیچ عدد تأییدشده‌ای در اختیار نیست، بنابراین استفاده نشده است.
- `bdt-step-flow` — در پیاده‌سازی‌های قبلی پیکان‌های بیش‌ازحد بزرگ تولید می‌کرد؛
  نقشهٔ راه با کانتینرهای معمولی ساخته شده تا کنترل بصری حفظ شود.

## جزئیات ریسک هر ویجت

| ویجت | افزونه | تأییدشده | ریسک | توضیح |
|---|---|---|---|---|
| `text-editor` | elementor | بله | low | — |
| `heading` | elementor | بله | low | — |
| `html` | elementor | بله | low | — |
| `button` | elementor | بله | low | — |
| `shortcode` | elementor | بله | low | — |
| `icon-list` | elementor | بله | low | — |
| `bdt-advanced-button` | bdthemes-element-pack-pro | خیر | medium | — |
| `icon-box` | elementor | بله | low | — |
| `accordion` | elementor | بله | low | title_html_tag requires Elementor 3.9+ |
| `theme-post-title` | elementor-pro | بله | low | — |
| `theme-post-excerpt` | elementor-pro | بله | low | — |
| `bdt-advanced-heading` | bdthemes-element-pack-pro | خیر | medium | — |
| `theme-post-featured-image` | elementor-pro | بله | low | — |
| `bdt-interactive-card` | bdthemes-element-pack-pro | خیر | medium | — |
| `search-form` | elementor | بله | low | native search widget type is "search-form" |
| `theme-post-content` | elementor-pro | بله | low | — |
| `testimonial` | elementor | بله | low | — |
| `posts` | elementor | بله | low | — |
| `form` | elementor-pro | بله | low | form actions (email/webhook) must be configured after import |
| `divider` | elementor | بله | low | — |
| `video` | elementor | بله | low | — |
| `woocommerce-product-price` | elementor-pro | خیر | medium | — |
| `bdt-dynamic-grid` | bdthemes-element-pack-pro | خیر | medium | template_id must be reselected after import |
| `woocommerce-product-images` | elementor-pro | خیر | medium | — |
| `woocommerce-product-add-to-cart` | elementor-pro | خیر | medium | — |
| `woocommerce-product-data-tabs` | elementor-pro | خیر | medium | — |
| `woocommerce-product-related` | elementor-pro | خیر | medium | — |
| `theme-site-logo` | elementor-pro | بله | low | — |
| `nav-menu` | elementor-pro | بله | medium | menu slug must be selected after import |
| `image` | elementor | بله | low | — |
| `bdt-advanced-image-gallery` | bdthemes-element-pack-pro | خیر | medium | — |
| `woocommerce-archive-products` | elementor-pro | بله | medium | — |
| `woocommerce-product-title` | elementor-pro | خیر | medium | — |
| `woocommerce-product-rating` | elementor-pro | خیر | medium | — |
| `woocommerce-product-stock` | elementor-pro | خیر | medium | — |
| `woocommerce-product-meta` | elementor-pro | خیر | medium | — |

## قالب‌هایی که بدون افزونهٔ خاص کار نمی‌کنند

- kit-php
- elementor-pro + learndash-lms + kit-php
- learndash-lms + kit-php
- elementor-pro + acf-pro + kit-php
- elementor-pro + woocommerce + kit-php
- learndash-lms + woocommerce + kit-php
- woocommerce + kit-php
- elementor-pro + kit-php
- digits + kit-php
- elementor + kit-php
