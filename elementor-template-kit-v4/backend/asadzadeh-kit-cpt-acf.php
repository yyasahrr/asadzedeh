<?php
/**
 * Asadzadeh Elementor Kit — post types, meta and ACF field groups.
 *
 * Registers the content model the templates assume (spec §33):
 *   - CPT az_artwork     (student works)
 *   - CPT learning_path  (learning paths, aggregates courses)
 *   - CPT instructor     (instructors)
 *   - workshop meta on WooCommerce products (start date, days, time)
 *
 * ACF Pro is used when available (local field groups registered in code so the
 * kit is reproducible); when ACF is missing, the same fields are registered as
 * plain post meta so the shortcodes keep working with `update_post_meta()`.
 *
 * SECURITY: all meta is registered with sanitize callbacks and
 * show_in_rest = false by default. Nothing here exposes private data.
 *
 * Install next to asadzadeh-kit-shortcodes.php (mu-plugins or a small plugin).
 *
 * @package AsadzadehKit
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* ---------------------------------------------------------------- CPTs */

add_action(
	'init',
	function () {
		$types = array(
			'az_artwork'    => array(
				'labels' => array(
					'name'          => 'آثار هنرجویان',
					'singular_name' => 'اثر',
					'add_new_item'  => 'افزودن اثر',
					'edit_item'     => 'ویرایش اثر',
				),
				'args'   => array(
					'public'       => true,
					'has_archive'  => true,
					// Persian-safe slugs: WordPress handles UTF-8 slugs fine as long
					// as permalinks are not forced into a transliteration plugin.
					'rewrite'      => array( 'slug' => 'artworks' ),
					'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
					'menu_icon'    => 'dashicons-format-image',
					'show_in_rest' => true,
				),
			),
			'learning_path' => array(
				'labels' => array(
					'name'          => 'مسیرهای یادگیری',
					'singular_name' => 'مسیر یادگیری',
					'add_new_item'  => 'افزودن مسیر',
					'edit_item'     => 'ویرایش مسیر',
				),
				'args'   => array(
					'public'       => true,
					'has_archive'  => true,
					'rewrite'      => array( 'slug' => 'learning-paths' ),
					'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
					'menu_icon'    => 'dashicons-chart-line',
					'show_in_rest' => true,
				),
			),
			'instructor'    => array(
				'labels' => array(
					'name'          => 'مدرسان',
					'singular_name' => 'مدرس',
					'add_new_item'  => 'افزودن مدرس',
					'edit_item'     => 'ویرایش مدرس',
				),
				'args'   => array(
					'public'       => true,
					'has_archive'  => true,
					'rewrite'      => array( 'slug' => 'instructors' ),
					'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
					'menu_icon'    => 'dashicons-businessperson',
					'show_in_rest' => true,
				),
			),
		);

		foreach ( $types as $key => $type ) {
			if ( post_type_exists( $key ) ) {
				continue;
			}
			register_post_type(
				$key,
				array_merge(
					$type['args'],
					array(
						'labels'       => $type['labels'],
						'public'       => true,
						'show_in_menu' => true,
					)
				)
			);
		}
	}
);

/* ------------------------------------------------- workshop product meta */

add_action(
	'init',
	function () {
		$fields = array(
			'_az_workshop_start' => 'تاریخ شروع',
			'_az_workshop_days'  => 'روزهای برگزاری',
			'_az_workshop_time'  => 'ساعت برگزاری',
			'_az_workshop_seats' => 'ظرفیت (در صورت عدم استفاده از موجودی)',
		);
		foreach ( $fields as $key => $label ) {
			register_post_meta(
				'product',
				$key,
				array(
					'type'              => 'string',
					'description'       => $label,
					'single'            => true,
					'sanitize_callback' => 'sanitize_text_field',
					'show_in_rest'      => false,
					'auth_callback'     => function () {
						return current_user_can( 'edit_products' );
					},
				)
			);
		}

		$course_fields = array(
			'_az_course_level'         => 'سطح دوره',
			'_az_course_duration'      => 'مدت دوره',
			'_az_course_sessions'      => 'تعداد جلسات',
			'_az_course_prerequisites' => 'پیش‌نیازها',
		);
		foreach ( $course_fields as $key => $label ) {
			register_post_meta(
				'sfwd-courses',
				$key,
				array(
					'type'              => 'string',
					'description'       => $label,
					'single'            => true,
					'sanitize_callback' => 'sanitize_text_field',
					'show_in_rest'      => false,
				)
			);
		}
	}
);

/** Admin metaboxes so the fields are usable without ACF. */
add_action(
	'add_meta_boxes',
	function () {
		add_meta_box( 'az_workshop_meta', 'اطلاعات کلاس حضوری', 'az_kit_workshop_metabox', 'product', 'side', 'default' );
	}
);

function az_kit_workshop_metabox( $post ) {
	wp_nonce_field( 'az_workshop_meta', 'az_workshop_meta_nonce' );
	$fields = array(
		'_az_workshop_start' => 'تاریخ شروع',
		'_az_workshop_days'  => 'روزهای برگزاری',
		'_az_workshop_time'  => 'ساعت برگزاری',
		'_az_workshop_seats' => 'ظرفیت (اختیاری)',
	);
	foreach ( $fields as $key => $label ) {
		$value = get_post_meta( $post->ID, $key, true );
		echo '<p><label for="' . esc_attr( $key ) . '">' . esc_html( $label ) . '</label><br>';
		echo '<input type="text" id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '" value="' . esc_attr( $value ) . '" style="width:100%" /></p>';
	}
}

add_action(
	'save_post_product',
	function ( $post_id ) {
		if ( ! isset( $_POST['az_workshop_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['az_workshop_meta_nonce'] ) ), 'az_workshop_meta' ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		$keys = array( '_az_workshop_start', '_az_workshop_days', '_az_workshop_time', '_az_workshop_seats' );
		foreach ( $keys as $key ) {
			if ( isset( $_POST[ $key ] ) ) {
				update_post_meta( $post_id, $key, sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) );
			}
		}
	}
);

/* --------------------------------------------- ensure the workshop category */

add_action(
	'init',
	function () {
		if ( ! function_exists( 'woocommerce' ) && ! taxonomy_exists( 'product_cat' ) ) {
			return;
		}
		if ( get_option( 'az_kit_workshop_cat_created' ) ) {
			return;
		}
		$term = term_exists( 'workshop', 'product_cat' );
		if ( ! $term ) {
			$term = wp_insert_term( 'کلاس‌های حضوری', 'product_cat', array( 'slug' => 'workshop' ) );
		}
		if ( ! is_wp_error( $term ) ) {
			update_option( 'az_kit_workshop_cat_created', 1 );
		}
	}
);

/* ------------------------------------------------------ ACF field groups */

add_action(
	'acf/init',
	function () {
		if ( ! function_exists( 'acf_add_local_field_group' ) ) {
			return;
		}

		acf_add_local_field_group(
			array(
				'key'      => 'group_az_learning_path',
				'title'    => 'مسیر یادگیری',
				'fields'   => array(
					array(
						'key'   => 'field_az_path_accent',
						'label' => 'رنگ شاخص',
						'name'  => 'accent',
						'type'  => 'select',
						'choices' => array(
							'navy'  => 'سرمه‌ای',
							'red'   => 'آجری',
							'teal'  => 'فیروزه‌ای',
							'cream' => 'کرم',
						),
						'default_value' => 'navy',
					),
					array(
						'key'   => 'field_az_path_duration',
						'label' => 'مدت کل',
						'name'  => 'duration',
						'type'  => 'text',
					),
					array(
						'key'     => 'field_az_path_courses',
						'label'   => 'دوره‌های مسیر (به ترتیب)',
						'name'    => 'path_courses',
						'type'    => 'relationship',
						'filters' => array( 'search' ),
						'return_format' => 'object',
						'post_type' => array( 'sfwd-courses' ),
						'min'     => 1,
					),
					array(
						'key'   => 'field_az_path_price',
						'label' => 'قیمت بسته',
						'name'  => 'fixed_price',
						'type'  => 'number',
					),
					array(
						'key'   => 'field_az_path_discount',
						'label' => 'تخفیف واقعی (در صورت وجود)',
						'name'  => 'discount',
						'type'  => 'number',
					),
					array(
						'key'   => 'field_az_path_outcomes',
						'label' => 'خروجی‌ها',
						'name'  => 'outcomes',
						'type'  => 'repeater',
						'sub_fields' => array(
							array(
								'key'   => 'field_az_path_outcome_item',
								'label' => 'مورد',
								'name'  => 'item',
								'type'  => 'text',
							),
						),
					),
					array(
						'key'   => 'field_az_path_faq',
						'label' => 'پرسش‌های پرتکرار',
						'name'  => 'faq',
						'type'  => 'repeater',
						'sub_fields' => array(
							array(
								'key'   => 'field_az_path_faq_q',
								'label' => 'پرسش',
								'name'  => 'q',
								'type'  => 'text',
							),
							array(
								'key'   => 'field_az_path_faq_a',
								'label' => 'پاسخ',
								'name'  => 'a',
								'type'  => 'textarea',
							),
						),
					),
				),
				'location' => array(
					array(
						array(
							'param'    => 'post_type',
							'operator' => '==',
							'value'    => 'learning_path',
						),
					),
				),
			)
		);

		acf_add_local_field_group(
			array(
				'key'      => 'group_az_instructor',
				'title'    => 'مدرس',
				'fields'   => array(
					array(
						'key'   => 'field_az_ins_specialty',
						'label' => 'تخصص',
						'name'  => 'specialty',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_ins_experience',
						'label' => 'سال تجربه (فقط در صورت تأیید)',
						'name'  => 'experience',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_ins_biography',
						'label' => 'بیوگرافی',
						'name'  => 'biography',
						'type'  => 'wysiwyg',
					),
					array(
						'key'   => 'field_az_ins_image',
						'label' => 'تصویر',
						'name'  => 'profile_image',
						'type'  => 'image',
					),
					array(
						'key'     => 'field_az_ins_courses',
						'label'   => 'دوره‌های مدرس',
						'name'    => 'featured_courses',
						'type'    => 'relationship',
						'post_type' => array( 'sfwd-courses' ),
						'return_format' => 'object',
					),
					array(
						'key'   => 'field_az_ins_social',
						'label' => 'شبکه‌ها',
						'name'  => 'social_links',
						'type'  => 'repeater',
						'sub_fields' => array(
							array(
								'key'   => 'field_az_ins_social_label',
								'label' => 'نام',
								'name'  => 'label',
								'type'  => 'text',
							),
							array(
								'key'   => 'field_az_ins_social_url',
								'label' => 'نشانی',
								'name'  => 'url',
								'type'  => 'url',
							),
						),
					),
				),
				'location' => array(
					array(
						array(
							'param'    => 'post_type',
							'operator' => '==',
							'value'    => 'instructor',
						),
					),
				),
			)
		);

		acf_add_local_field_group(
			array(
				'key'      => 'group_az_artwork',
				'title'    => 'اثر',
				'fields'   => array(
					array(
						'key'   => 'field_az_art_technique',
						'label' => 'تکنیک',
						'name'  => 'technique',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_art_materials',
						'label' => 'مواد',
						'name'  => 'materials',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_art_dimensions',
						'label' => 'ابعاد',
						'name'  => 'dimensions',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_art_artist',
						'label' => 'هنرمند / هنرجو',
						'name'  => 'artist',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_art_year',
						'label' => 'سال',
						'name'  => 'year',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_art_gallery',
						'label' => 'گالری تصاویر',
						'name'  => 'gallery',
						'type'  => 'gallery',
					),
				),
				'location' => array(
					array(
						array(
							'param'    => 'post_type',
							'operator' => '==',
							'value'    => 'az_artwork',
						),
					),
				),
			)
		);

		acf_add_local_field_group(
			array(
				'key'      => 'group_az_course',
				'title'    => 'جزئیات دوره',
				'fields'   => array(
					array(
						'key'   => 'field_az_course_level',
						'label' => 'سطح',
						'name'  => 'course_level',
						'type'  => 'select',
						'choices' => array(
							'مقدماتی'  => 'مقدماتی',
							'متوسط'    => 'متوسط',
							'پیشرفته'  => 'پیشرفته',
						),
					),
					array(
						'key'   => 'field_az_course_duration',
						'label' => 'مدت',
						'name'  => 'course_duration',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_course_sessions',
						'label' => 'تعداد جلسات',
						'name'  => 'course_sessions',
						'type'  => 'text',
					),
					array(
						'key'   => 'field_az_course_prerequisites',
						'label' => 'پیش‌نیازها',
						'name'  => 'course_prerequisites',
						'type'  => 'textarea',
					),
				),
				'location' => array(
					array(
						array(
							'param'    => 'post_type',
							'operator' => '==',
							'value'    => 'sfwd-courses',
						),
					),
				),
			)
		);
	}
);
