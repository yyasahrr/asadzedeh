/**
 * Loop Item templates (Elementor Pro Loop Grid + Element Pack Dynamic Grid).
 *
 * Loop items are intentionally compact: they render once per card, so the DOM
 * must stay small (spec §37). All content is dynamic — no hardcoded titles.
 */
import { C, edge, gap, LAYOUT } from '../tokens.mjs';
import { container, heading, paragraph, button, kicker, iconList, shortcodeWidget, widget, htmlBlock } from '../dom.mjs';
import { metaRow } from '../sections/ui.mjs';
import { sc } from '../shortcodes.mjs';
import { define } from '../registry.mjs';

function loopShell(doc, seed, opts) {
  const { title, metaCode = null, cta = null, ratio = '43', navTitle = 'Loop Item' } = opts;
  return [
    container(
      doc,
      `${seed}-root`,
      [
        widget(
          doc,
          `${seed}-image`,
          'theme-post-featured-image',
          {
            link_to: 'custom',
            aspect_ratio: ratio === '11' ? '11' : '43',
            object_fit: 'cover',
            image_border_radius: edge(16),
            __dynamic__: {
              link: '[elementor-tag id="lpurl" name="post-url" settings="%7B%7D"]',
            },
          },
          { title: 'تصویر شاخص (داینامیک)', cls: 'az-loop-image' }
        ),
        container(
          doc,
          `${seed}-body`,
          [
            metaCode
              ? container(doc, `${seed}-meta`, [shortcodeWidget(doc, `${seed}-meta-sc`, metaCode, { title: 'متادادهٔ داینامیک' })], { title: 'متاداده', cls: 'az-loop-meta az-mount', g: 0 })
              : null,
            widget(
              doc,
              `${seed}-title`,
              'theme-post-title',
              {
                header_size: 'h3',
                align: 'right',
                title_color: C.navy,
                typography_typography: 'custom',
                typography_font_family: 'Neirizi',
                typography_font_size: { unit: 'px', size: 21, sizes: [] },
                typography_line_height: { unit: 'em', size: 1.45, sizes: [] },
              },
              { title: 'عنوان (داینامیک)', cls: 'az-loop-title' }
            ),
            widget(
              doc,
              `${seed}-excerpt`,
              'theme-post-excerpt',
              {
                text_color: C.muted,
                typography_typography: 'custom',
                typography_font_family: 'Peyda',
                typography_font_size: { unit: 'px', size: 14, sizes: [] },
                typography_line_height: { unit: 'em', size: 1.85, sizes: [] },
              },
              { title: 'خلاصه (داینامیک)', cls: 'az-loop-excerpt' }
            ),
            cta ? button(doc, `${seed}-cta`, cta, '#', { variant: 'ghost', block: false, size: 'sm', title: `CTA — ${cta}` }) : null,
          ].filter(Boolean),
          { title: 'بدنهٔ کارت', cls: 'az-loop-body az-stack', g: 8 }
        ),
      ],
      {
        title,
        cls: 'az-card az-loop-card',
        g: 12,
        justify: 'space-between',
        padding: { unit: 'px', top: '18', right: '18', bottom: '18', left: '18', isLinked: false },
        responsive: {
          tablet: { padding: { unit: 'px', top: '16', right: '16', bottom: '16', left: '16', isLinked: false } },
          mobile: { padding: { unit: 'px', top: '14', right: '14', bottom: '14', left: '14', isLinked: false } },
        },
        customCss: `selector{ height:100%; }\nselector .elementor-widget-theme-post-featured-image img{ width:100%; }`,
      }
    ),
  ];
}

export function registerLoops() {
  define(
    {
      slug: 'loop-course',
      title: 'Loop — دوره',
      docType: 'loop-item',
      group: 'Loops',
      page: 'sfwd-courses',
      plugins: ['elementor-pro', 'learndash-lms', 'kit-php'],
      dynamic: 'عنوان/خلاصه/تصویر + az_course_meta',
      url: '',
      condition: 'در Loop Grid یا Dynamic Grid مربوط به دوره‌ها انتخاب شود',
      manual: 'پس از Import، این Loop Item را در ویجت گرید انتخاب کنید.',
      status: 'READY — NEEDS DYNAMIC BINDING',
    },
    (doc) => loopShell(doc, 'lc', { title: 'Loop — دوره', metaCode: sc('az_course_meta', { field: 'level_duration' }), cta: 'مشاهدهٔ دوره', navTitle: 'Loop — دوره' })
  );

  define(
    {
      slug: 'loop-product',
      title: 'Loop — محصول / کلاس',
      docType: 'loop-item',
      group: 'Loops',
      page: 'product',
      plugins: ['elementor-pro', 'woocommerce'],
      dynamic: 'عنوان/خلاصه/تصویر محصول',
      url: '',
      condition: 'در گرید محصولات انتخاب شود',
      manual: 'قیمت در صورت نیاز با ویجت Price به کارت اضافه شود.',
      status: 'READY — NEEDS DYNAMIC BINDING',
    },
    (doc) => [
      container(
        doc,
        'lp-root',
        [
          widget(doc, 'lp-image', 'theme-post-featured-image', { link_to: 'custom', aspect_ratio: '43', object_fit: 'cover', image_border_radius: edge(16) }, { title: 'تصویر محصول', cls: 'az-loop-image' }),
          container(
            doc,
            'lp-body',
            [
              widget(doc, 'lp-title', 'theme-post-title', { header_size: 'h3', align: 'right', title_color: C.navy, typography_typography: 'custom', typography_font_family: 'Neirizi', typography_font_size: { unit: 'px', size: 20, sizes: [] } }, { title: 'عنوان محصول', cls: 'az-loop-title' }),
              widget(doc, 'lp-price', 'woocommerce-product-price', {}, { title: 'قیمت (داینامیک)', cls: 'az-loop-price az-woo-widget' }),
              widget(doc, 'lp-excerpt', 'theme-post-excerpt', { text_color: C.muted, typography_typography: 'custom', typography_font_family: 'Peyda', typography_font_size: { unit: 'px', size: 14, sizes: [] } }, { title: 'خلاصه', cls: 'az-loop-excerpt' }),
            ],
            { title: 'بدنهٔ کارت', cls: 'az-loop-body az-stack', g: 8 }
          ),
        ],
        {
          title: 'Loop — محصول',
          cls: 'az-card az-loop-card',
          g: 12,
          justify: 'space-between',
          padding: { unit: 'px', top: '18', right: '18', bottom: '18', left: '18', isLinked: false },
          responsive: {
            tablet: { padding: { unit: 'px', top: '16', right: '16', bottom: '16', left: '16', isLinked: false } },
            mobile: { padding: { unit: 'px', top: '14', right: '14', bottom: '14', left: '14', isLinked: false } },
          },
        }
      ),
    ]
  );

  define(
    {
      slug: 'loop-post',
      title: 'Loop — نوشته',
      docType: 'loop-item',
      group: 'Loops',
      page: 'post',
      plugins: ['elementor-pro'],
      dynamic: 'عنوان/خلاصه/تصویر نوشته',
      url: '',
      condition: 'در گرید نوشته‌ها انتخاب شود',
      manual: '',
      status: 'READY',
    },
    (doc) => loopShell(doc, 'lb', { title: 'Loop — نوشته', cta: 'ادامهٔ مطلب', navTitle: 'Loop — نوشته' })
  );

  define(
    {
      slug: 'loop-artwork',
      title: 'Loop — اثر',
      docType: 'loop-item',
      group: 'Loops',
      page: 'az_artwork',
      plugins: ['elementor-pro', 'acf-pro'],
      dynamic: 'عنوان/تصویر اثر + ACF technique',
      url: '',
      condition: 'در Dynamic Grid آثار انتخاب شود',
      manual: 'فیلد ACF تکنیک را در صورت نیاز اضافه کنید.',
      status: 'READY — NEEDS DYNAMIC BINDING',
    },
    (doc) => loopShell(doc, 'la', { title: 'Loop — اثر', ratio: '11', cta: 'مشاهدهٔ اثر', navTitle: 'Loop — اثر' })
  );

  define(
    {
      slug: 'loop-instructor',
      title: 'Loop — مدرس',
      docType: 'loop-item',
      group: 'Loops',
      page: 'instructor',
      plugins: ['elementor-pro', 'acf-pro'],
      dynamic: 'نام/تصویر مدرس + ACF specialty',
      url: '',
      condition: 'در Dynamic Grid مدرسان انتخاب شود',
      manual: '',
      status: 'READY — NEEDS DYNAMIC BINDING',
    },
    (doc) => loopShell(doc, 'li', { title: 'Loop — مدرس', ratio: '11', cta: 'مشاهدهٔ صفحه', navTitle: 'Loop — مدرس' })
  );
}
