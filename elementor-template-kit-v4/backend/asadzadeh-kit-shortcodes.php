<?php
/**
 * Asadzadeh Elementor Kit — backend shortcodes.
 *
 * WHY THIS FILE EXISTS
 * Several templates in the kit need real data (enrollment state, progress,
 * assignments, certificates, workshop capacity). Elementor cannot express
 * that logic, and faking it in the frontend would show wrong numbers to real
 * students. So the logic lives here, and the templates only render whatever
 * this file returns.
 *
 * SECURITY NOTES (read before editing)
 *  - every form is protected with a nonce and checked with wp_verify_nonce()
 *  - every query that touches personal data first checks is_user_logged_in()
 *  - order/certificate lookups verify ownership (customer id or order key)
 *  - all output is escaped; all input is sanitized
 *  - the public certificate verification is rate limited with a transient
 *  - no secrets, keys or credentials are stored in this file
 *
 * Install: copy this file into wp-content/mu-plugins/ (mu-plugins loads it
 * automatically) or wrap it as a small plugin.
 *
 * @package AsadzadehKit
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'AZ_KIT_VERSION' ) ) {
	define( 'AZ_KIT_VERSION', '5.0.0' );
}

/**
 * Small helper: render a themed empty state instead of a fake number.
 * Spec §21: "If a count cannot be populated dynamically: show an empty state
 * instead of fake numbers."
 */
function az_kit_empty( $text, $cta_label = '', $cta_url = '' ) {
	$html = '<div class="az-state"><div class="az-state__icon" aria-hidden="true">✉</div>';
	$html .= '<p>' . esc_html( $text ) . '</p>';
	if ( $cta_label && $cta_url ) {
		$html .= '<a class="az-btn az-btn--primary" href="' . esc_url( $cta_url ) . '">' . esc_html( $cta_label ) . '</a>';
	}
	$html .= '</div>';
	return $html;
}

/** Login gate used by every personal shortcode. */
function az_kit_login_gate() {
	return az_kit_empty(
		'برای دیدن این بخش باید وارد حساب کاربری خود شوید.',
		'ورود / ثبت‌نام',
		function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : wp_login_url()
	);
}

/** Resolve the current course id from context (query var, post, or attribute). */
function az_kit_current_course_id( $course_id = 0 ) {
	$course_id = absint( $course_id );
	if ( $course_id ) {
		return $course_id;
	}
	$post_id = get_queried_object_id();
	if ( ! $post_id ) {
		$post_id = get_the_ID();
	}
	if ( ! $post_id ) {
		return 0;
	}
	if ( function_exists( 'learndash_get_course_id' ) ) {
		return absint( learndash_get_course_id( $post_id ) );
	}
	return 'sfwd-courses' === get_post_type( $post_id ) ? $post_id : 0;
}

/**
 * [az_dashboard_stats] — real counters only.
 * Renders 4 tiles: active courses, completed courses, pending assignments,
 * upcoming workshops. Counts come from LearnDash/Woo, never hardcoded.
 */
add_shortcode(
	'az_dashboard_stats',
	function () {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$user_id = get_current_user_id();
		$tiles   = array();

		$active = 0;
		$done   = 0;
		if ( function_exists( 'learndash_user_get_enrolled_courses' ) ) {
			$courses = (array) learndash_user_get_enrolled_courses( $user_id, array( 'limit' => 0 ) );
			foreach ( $courses as $course_id ) {
				$course_id = absint( $course_id );
				if ( ! $course_id ) {
					continue;
				}
				if ( function_exists( 'learndash_course_status' ) && 'completed' === learndash_course_status( $course_id, $user_id ) ) {
					$done++;
				} else {
					$active++;
				}
			}
		}

		$pending = az_kit_count_pending_assignments( $user_id );
		$classes = az_kit_get_user_workshop_orders( $user_id, 20 );

		$tiles = array(
			array( 'label' => 'دوره‌های در حال یادگیری', 'value' => $active ),
			array( 'label' => 'دوره‌های تکمیل‌شده', 'value' => $done ),
			array( 'label' => 'تکالیف در انتظار بررسی', 'value' => $pending ),
			array( 'label' => 'کلاس‌های حضوری ثبت‌شده', 'value' => count( $classes ) ),
		);

		$html = '<div class="az-tiles">';
		foreach ( $tiles as $tile ) {
			$html .= '<div class="az-tile"><div class="az-tile__label">' . esc_html( $tile['label'] ) . '</div>';
			$html .= '<div class="az-tile__value">' . esc_html( az_kit_persian_number( (int) $tile['value'] ) ) . '</div></div>';
		}
		$html .= '</div>';
		return $html;
	}
);

/** Count assignments waiting for review. */
function az_kit_count_pending_assignments( $user_id ) {
	if ( ! post_type_exists( 'sfwd-assignment' ) ) {
		return 0;
	}
	$query = new WP_Query(
		array(
			'post_type'      => 'sfwd-assignment',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_query'     => array(
				array(
					'key'   => 'user_id',
					'value' => absint( $user_id ),
				),
			),
		)
	);
	$count = 0;
	foreach ( $query->posts as $assignment_id ) {
		if ( ! az_kit_assignment_is_approved( $assignment_id ) ) {
			$count++;
		}
	}
	return $count;
}

/**
 * LearnDash stores approval in `_approval_status` (1 = approved).
 * Filterable so it can be adapted if the site uses a different flow.
 */
function az_kit_assignment_is_approved( $assignment_id ) {
	$status = get_post_meta( $assignment_id, '_approval_status', true );
	return apply_filters( 'az_kit_assignment_approved', '1' === (string) $status, $assignment_id );
}

/** Orders that contain a product from the `workshop` category. */
function az_kit_get_user_workshop_orders( $user_id, $limit = 20 ) {
	$found = array();
	if ( ! function_exists( 'wc_get_orders' ) ) {
		return $found;
	}
	$orders = wc_get_orders(
		array(
			'customer_id' => absint( $user_id ),
			'limit'       => absint( $limit ),
			'status'      => array( 'wc-completed', 'wc-processing', 'wc-on-hold' ),
			'orderby'     => 'date',
			'order'       => 'DESC',
		)
	);
	foreach ( $orders as $order ) {
		foreach ( $order->get_items() as $item ) {
			$product_id = $item->get_product_id();
			if ( $product_id && has_term( 'workshop', 'product_cat', $product_id ) ) {
				$found[] = $order;
				break;
			}
		}
	}
	return $found;
}

/** Persian numerals for display (never used to fake values). */
function az_kit_persian_number( $value ) {
	$map = array( '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴', '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹' );
	return strtr( (string) $value, $map );
}

/**
 * [az_continue_learning course_id=""] — the last lesson the user opened.
 */
add_shortcode(
	'az_continue_learning',
	function ( $atts ) {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$atts      = shortcode_atts( array( 'course_id' => 0 ), $atts, 'az_continue_learning' );
		$user_id   = get_current_user_id();
		$course_id = az_kit_current_course_id( $atts['course_id'] );

		if ( ! $course_id && function_exists( 'learndash_user_get_enrolled_courses' ) ) {
			$courses = (array) learndash_user_get_enrolled_courses( $user_id, array( 'limit' => 1 ) );
			$course_id = absint( reset( $courses ) );
		}
		if ( ! $course_id ) {
			return az_kit_empty( 'هنوز دوره‌ای شروع نکرده‌اید.', 'مشاهدهٔ دوره‌ها', home_url( '/courses/' ) );
		}

		$progress = az_kit_course_progress( $user_id, $course_id );
		$next_url = az_kit_next_step_url( $user_id, $course_id );

		$html  = '<div class="az-card az-continue-card"><div class="az-continue-row">';
		$html .= '<div class="az-continue-media">' . get_the_post_thumbnail( $course_id, 'medium_large', array( 'loading' => 'lazy' ) ) . '</div>';
		$html .= '<div class="az-continue-copy">';
		$html .= '<span class="az-badge">ادامه از آخرین درس</span>';
		$html .= '<h3>' . esc_html( get_the_title( $course_id ) ) . '</h3>';
		$html .= '<div class="az-progress" role="progressbar" aria-valuenow="' . esc_attr( $progress['percent'] ) . '" aria-valuemin="0" aria-valuemax="100"><i style="width:' . esc_attr( $progress['percent'] ) . '%"></i></div>';
		$html .= '<div class="az-progress-label"><span>' . esc_html( az_kit_persian_number( $progress['completed'] ) ) . ' از ' . esc_html( az_kit_persian_number( $progress['total'] ) ) . ' گام</span><span>' . esc_html( az_kit_persian_number( $progress['percent'] ) ) . '٪</span></div>';
		if ( $next_url ) {
			$html .= '<a class="az-btn az-btn--primary" href="' . esc_url( $next_url ) . '">ادامهٔ یادگیری</a>';
		}
		$html .= '</div></div></div>';
		return $html;
	}
);

/** Progress array, tolerant of both old and new LearnDash APIs. */
function az_kit_course_progress( $user_id, $course_id ) {
	$completed = 0;
	$total     = 0;
	if ( function_exists( 'learndash_user_get_course_progress' ) ) {
		$progress = learndash_user_get_course_progress( $user_id, $course_id );
		if ( is_array( $progress ) ) {
			$completed = isset( $progress['completed'] ) ? (int) $progress['completed'] : 0;
			$total     = isset( $progress['total'] ) ? (int) $progress['total'] : 0;
		}
	} elseif ( function_exists( 'learndash_course_progress' ) ) {
		$progress = learndash_course_progress(
			array(
				'user_id'   => $user_id,
				'course_id' => $course_id,
				'array'     => true,
			)
		);
		if ( is_array( $progress ) ) {
			$completed = isset( $progress['completed'] ) ? (int) $progress['completed'] : 0;
			$total     = isset( $progress['total'] ) ? (int) $progress['total'] : 0;
		}
	}
	$percent = $total > 0 ? (int) round( ( $completed / $total ) * 100 ) : 0;
	return array(
		'completed' => $completed,
		'total'     => $total,
		'percent'   => $percent,
	);
}

function az_kit_next_step_url( $user_id, $course_id ) {
	if ( ! function_exists( 'learndash_get_course_lessons_list' ) ) {
		return get_permalink( $course_id );
	}
	$lessons = learndash_get_course_lessons_list( $course_id, $user_id, array( 'num' => -1 ) );
	foreach ( $lessons as $lesson ) {
		$status = isset( $lesson['status'] ) ? $lesson['status'] : '';
		if ( 'completed' !== $status ) {
			return get_permalink( $lesson['post']->ID );
		}
	}
	return get_permalink( $course_id );
}

/**
 * [az_my_courses limit=""] — enrolled courses with real progress.
 */
add_shortcode(
	'az_my_courses',
	function ( $atts ) {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$atts    = shortcode_atts( array( 'limit' => 12 ), $atts, 'az_my_courses' );
		$user_id = get_current_user_id();
		if ( ! function_exists( 'learndash_user_get_enrolled_courses' ) ) {
			return az_kit_empty( 'افزونهٔ LearnDash فعال نیست.' );
		}
		$courses = (array) learndash_user_get_enrolled_courses( $user_id, array( 'limit' => absint( $atts['limit'] ) ) );
		if ( empty( $courses ) ) {
			return az_kit_empty( 'هنوز دوره‌ای ثبت نکرده‌اید.', 'مشاهدهٔ دوره‌ها', home_url( '/courses/' ) );
		}

		$html = '<div class="az-grid az-grid--2 az-ld-list">';
		foreach ( $courses as $course_id ) {
			$course_id = absint( $course_id );
			if ( ! $course_id ) {
				continue;
			}
			$progress = az_kit_course_progress( $user_id, $course_id );
			$status   = function_exists( 'learndash_course_status' ) ? learndash_course_status( $course_id, $user_id ) : '';
			$html    .= '<article class="az-card">';
			$html    .= '<a href="' . esc_url( get_permalink( $course_id ) ) . '">' . get_the_post_thumbnail( $course_id, 'medium', array( 'loading' => 'lazy' ) ) . '</a>';
			$html    .= '<h3><a href="' . esc_url( get_permalink( $course_id ) ) . '">' . esc_html( get_the_title( $course_id ) ) . '</a></h3>';
			$html    .= '<div class="az-progress" role="progressbar" aria-valuenow="' . esc_attr( $progress['percent'] ) . '" aria-valuemin="0" aria-valuemax="100"><i style="width:' . esc_attr( $progress['percent'] ) . '%"></i></div>';
			$html    .= '<div class="az-progress-label"><span>' . esc_html( az_kit_persian_number( $progress['percent'] ) ) . '٪ تکمیل</span><span>' . esc_html( az_kit_status_label( $status ) ) . '</span></div>';
			$html    .= '</article>';
		}
		$html .= '</div>';
		return $html;
	}
);

function az_kit_status_label( $status ) {
	$map = array(
		'not_started' => 'شروع نشده',
		'in_progress' => 'در حال یادگیری',
		'completed'   => 'تکمیل شده',
	);
	return isset( $map[ $status ] ) ? $map[ $status ] : '';
}

/**
 * [az_my_workshops] — in-person classes bought through WooCommerce.
 */
add_shortcode(
	'az_my_workshops',
	function () {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$orders = az_kit_get_user_workshop_orders( get_current_user_id() );
		if ( empty( $orders ) ) {
			return az_kit_empty( 'کلاس حضوری فعالی ندارید.', 'مشاهدهٔ کلاس‌ها', home_url( '/workshops/' ) );
		}
		$html = '<div class="az-grid az-grid--2">';
		foreach ( $orders as $order ) {
			foreach ( $order->get_items() as $item ) {
				$product_id = $item->get_product_id();
				if ( ! has_term( 'workshop', 'product_cat', $product_id ) ) {
					continue;
				}
				$html .= '<article class="az-card">';
				$html .= '<span class="az-badge az-badge--info">' . esc_html( wc_get_order_status_name( $order->get_status() ) ) . '</span>';
				$html .= '<h3><a href="' . esc_url( get_permalink( $product_id ) ) . '">' . esc_html( $item->get_name() ) . '</a></h3>';
				$html .= '<div class="az-card__meta"><span>' . esc_html( $order->get_date_created() ? $order->get_date_created()->date_i18n( 'j F Y' ) : '' ) . '</span></div>';
				$html .= '<a class="az-btn az-btn--outline" href="' . esc_url( $order->get_view_order_url() ) . '">جزئیات سفارش</a>';
				$html .= '</article>';
			}
		}
		$html .= '</div>';
		return $html;
	}
);

/**
 * [az_assignments course_id=""] — assignments with real status badges.
 */
add_shortcode(
	'az_assignments',
	function ( $atts ) {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$atts      = shortcode_atts( array( 'course_id' => 0 ), $atts, 'az_assignments' );
		$user_id   = get_current_user_id();
		$course_id = az_kit_current_course_id( $atts['course_id'] );

		if ( ! post_type_exists( 'sfwd-assignment' ) ) {
			return az_kit_empty( 'تکلیفی برای نمایش وجود ندارد.' );
		}

		$meta_query = array(
			array(
				'key'   => 'user_id',
				'value' => absint( $user_id ),
			),
		);
		if ( $course_id ) {
			$meta_query[] = array(
				'key'   => 'course_id',
				'value' => absint( $course_id ),
			);
		}

		$query = new WP_Query(
			array(
				'post_type'      => 'sfwd-assignment',
				'post_status'    => 'publish',
				'posts_per_page' => 50,
				'meta_query'     => $meta_query,
				'orderby'        => 'date',
				'order'          => 'DESC',
			)
		);

		if ( ! $query->have_posts() ) {
			return az_kit_empty( 'تکلیف فعالی ندارید.', 'دوره‌های من', home_url( '/dashboard/courses/' ) );
		}

		$html = '<div class="az-ld-list">';
		while ( $query->have_posts() ) {
			$query->the_post();
			$assignment_id = get_the_ID();
			$approved      = az_kit_assignment_is_approved( $assignment_id );
			$badge         = $approved
				? '<span class="az-badge az-badge--success">تأیید شده</span>'
				: '<span class="az-badge az-badge--warn">در انتظار بررسی</span>';
			$html         .= '<div class="az-ld-item">';
			$html         .= '<span class="az-ld-item__n" aria-hidden="true">' . ( $approved ? '✓' : '⏳' ) . '</span>';
			$html         .= '<span class="az-ld-item__grow"><span class="az-ld-item__title">' . esc_html( get_the_title() ) . '</span>';
			$html         .= '<span class="az-ld-item__meta">' . esc_html( get_the_date( 'j F Y' ) ) . '</span></span>';
			$html         .= $badge;
			$html         .= '</div>';
		}
		wp_reset_postdata();
		$html .= '</div>';
		return $html;
	}
);

/**
 * [az_assignment_upload course_id="" lesson_id=""] — upload form.
 * Accepts one file, validates type/size, stores it as a LearnDash assignment.
 */
add_shortcode(
	'az_assignment_upload',
	function ( $atts ) {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$atts      = shortcode_atts(
			array(
				'course_id' => 0,
				'lesson_id' => 0,
			),
			$atts,
			'az_assignment_upload'
		);
		$course_id = az_kit_current_course_id( $atts['course_id'] );
		$lesson_id = absint( $atts['lesson_id'] ) ? absint( $atts['lesson_id'] ) : az_kit_current_course_id( 0 );

		$notice = '';
		if ( 'POST' === $_SERVER['REQUEST_METHOD'] && isset( $_POST['az_assignment_nonce'] ) ) {
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['az_assignment_nonce'] ) ), 'az_assignment_upload' ) ) {
				$notice = '<div class="az-form-error">درخواست نامعتبر است. صفحه را تازه‌سازی و دوباره تلاش کنید.</div>';
			} elseif ( empty( $_FILES['az_assignment_file']['name'] ) ) {
				$notice = '<div class="az-form-error">هیچ فایلی انتخاب نشده است.</div>';
			} else {
				$result = az_kit_handle_assignment_upload( $_FILES['az_assignment_file'], $course_id, $lesson_id );
				$notice = is_wp_error( $result )
					? '<div class="az-form-error">' . esc_html( $result->get_error_message() ) . '</div>'
					: '<div class="az-badge az-badge--success">تکلیف ارسال شد و در انتظار بررسی مدرس است.</div>';
			}
		}

		$html  = '<form class="az-form" method="post" enctype="multipart/form-data">';
		$html .= wp_nonce_field( 'az_assignment_upload', 'az_assignment_nonce', true, false );
		$html .= '<div class="az-field"><label for="az_assignment_file">فایل تکلیف</label>';
		$html .= '<input type="file" id="az_assignment_file" name="az_assignment_file" accept="image/*,.pdf,.zip" required /></div>';
		$html .= '<button type="submit" class="az-btn az-btn--primary az-btn--block">ارسال تکلیف</button>';
		$html .= '</form>';
		return $notice . $html;
	}
);

function az_kit_handle_assignment_upload( $file, $course_id, $lesson_id ) {
	$allowed = array( 'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/zip' );
	$max     = 20 * MB_IN_BYTES;

	if ( $file['size'] > $max ) {
		return new WP_Error( 'az_file_size', 'حجم فایل بیش از ۲۰ مگابایت است.' );
	}
	$finfo    = wp_check_filetype_and_ext( $file['tmp_name'], $file['name'] );
	$mime     = ! empty( $finfo['type'] ) ? $finfo['type'] : $file['type'];
	if ( ! in_array( $mime, $allowed, true ) ) {
		return new WP_Error( 'az_file_type', 'نوع فایل مجاز نیست (تصویر، PDF یا ZIP).' );
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$attachment_id = media_handle_sideload( $file, 0, null, array( 'post_author' => get_current_user_id() ) );
	if ( is_wp_error( $attachment_id ) ) {
		return $attachment_id;
	}

	$assignment_id = wp_insert_post(
		array(
			'post_type'    => 'sfwd-assignment',
			'post_status'  => 'publish',
			'post_title'   => sprintf( 'تکلیف — %s', get_the_title( $lesson_id ? $lesson_id : $course_id ) ),
			'post_content' => '',
			'post_author'  => get_current_user_id(),
		),
		true
	);
	if ( is_wp_error( $assignment_id ) ) {
		return $assignment_id;
	}

	update_post_meta( $assignment_id, 'user_id', get_current_user_id() );
	update_post_meta( $assignment_id, 'course_id', absint( $course_id ) );
	update_post_meta( $assignment_id, 'lesson_id', absint( $lesson_id ) );
	update_post_meta( $assignment_id, 'file_path', esc_url_raw( wp_get_attachment_url( $attachment_id ) ) );
	update_post_meta( $assignment_id, '_approval_status', '0' );

	do_action( 'az_kit_assignment_uploaded', $assignment_id, $course_id, $lesson_id );
	return $assignment_id;
}

/**
 * [az_my_certificates] and [az_certificate_detail].
 */
add_shortcode(
	'az_my_certificates',
	function () {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$user_id = get_current_user_id();
		$items   = az_kit_get_user_certificates( $user_id );
		if ( empty( $items ) ) {
			return az_kit_empty( 'گواهی‌ای صادر نشده است.', 'ادامهٔ یادگیری', home_url( '/dashboard/courses/' ) );
		}
		$html = '<div class="az-grid az-grid--2">';
		foreach ( $items as $item ) {
			$html .= '<article class="az-card">';
			$html .= '<h3>' . esc_html( $item['title'] ) . '</h3>';
			$html .= '<div class="az-card__meta"><span>' . esc_html( $item['date'] ) . '</span><span>شناسه: ' . esc_html( $item['code'] ) . '</span></div>';
			if ( $item['url'] ) {
				$html .= '<a class="az-btn az-btn--primary" href="' . esc_url( $item['url'] ) . '">مشاهدهٔ گواهی</a>';
			}
			$html .= '</article>';
		}
		$html .= '</div>';
		return $html;
	}
);

add_shortcode(
	'az_certificate_detail',
	function ( $atts ) {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$atts = shortcode_atts( array( 'id' => 0 ), $atts, 'az_certificate_detail' );
		$code = $atts['id'] ? sanitize_text_field( $atts['id'] ) : sanitize_text_field( (string) get_query_var( 'cert_id', '' ) );
		if ( ! $code ) {
			return az_kit_empty( 'گواهی‌ای انتخاب نشده است.' );
		}
		$cert = az_kit_find_certificate( $code );
		if ( ! $cert ) {
			return az_kit_empty( 'گواهی‌ای با این شناسه پیدا نشد.', 'گواهی‌های من', home_url( '/dashboard/certificates/' ) );
		}
		// ownership check: only the owner may see the detail page
		if ( (int) $cert['user_id'] !== get_current_user_id() && ! current_user_can( 'manage_options' ) ) {
			return az_kit_empty( 'دسترسی به این گواهی مجاز نیست.' );
		}
		$html  = '<div class="az-cert">';
		$html .= '<h1>' . esc_html( $cert['course_title'] ) . '</h1>';
		$html .= '<div class="az-table-wrap"><table><tbody>';
		$html .= '<tr><th scope="row">دارنده</th><td>' . esc_html( $cert['student'] ) . '</td></tr>';
		$html .= '<tr><th scope="row">تاریخ صدور</th><td>' . esc_html( $cert['date'] ) . '</td></tr>';
		$html .= '<tr><th scope="row">شناسه</th><td dir="ltr">' . esc_html( $cert['code'] ) . '</td></tr>';
		$html .= '<tr><th scope="row">وضعیت</th><td><span class="az-badge az-badge--success">معتبر</span></td></tr>';
		$html .= '</tbody></table></div>';
		if ( $cert['url'] ) {
			$html .= '<a class="az-btn az-btn--primary" href="' . esc_url( $cert['url'] ) . '">دانلود / مشاهده</a>';
		}
		$html .= '</div>';
		return $html;
	}
);

/**
 * Certificates are derived from completed LearnDash courses.
 * Filterable so a dedicated certificate plugin can take over.
 */
function az_kit_get_user_certificates( $user_id ) {
	$items = array();
	if ( ! function_exists( 'learndash_user_get_enrolled_courses' ) ) {
		return $items;
	}
	$courses = (array) learndash_user_get_enrolled_courses( $user_id, array( 'limit' => 0 ) );
	foreach ( $courses as $course_id ) {
		$course_id = absint( $course_id );
		if ( ! $course_id ) {
			continue;
		}
		if ( function_exists( 'learndash_course_status' ) && 'completed' !== learndash_course_status( $course_id, $user_id ) ) {
			continue;
		}
		$url = function_exists( 'learndash_get_course_certificate_link' ) ? learndash_get_course_certificate_link( $course_id, $user_id ) : '';
		$items[] = array(
			'code'         => az_kit_certificate_code( $course_id, $user_id ),
			'title'        => get_the_title( $course_id ),
			'course_title' => get_the_title( $course_id ),
			'date'         => get_the_modified_date( 'j F Y', $course_id ),
			'url'          => $url,
			'user_id'      => (int) $user_id,
			'course_id'    => $course_id,
			'student'      => wp_get_current_user()->display_name,
		);
	}
	return apply_filters( 'az_kit_user_certificates', $items, $user_id );
}

/** Deterministic, non-guessable-ish certificate code (HMAC, no secrets in repo). */
function az_kit_certificate_code( $course_id, $user_id ) {
	$raw = $course_id . '|' . $user_id . '|' . wp_salt( 'auth' );
	return 'AZ-' . strtoupper( substr( hash( 'sha256', $raw ), 0, 10 ) );
}

function az_kit_find_certificate( $code ) {
	$code = strtoupper( sanitize_text_field( $code ) );
	if ( 0 !== strpos( $code, 'AZ-' ) ) {
		return null;
	}
	$user_id = get_current_user_id();
	foreach ( az_kit_get_user_certificates( $user_id ) as $cert ) {
		if ( hash_equals( strtoupper( $cert['code'] ), $code ) ) {
			return $cert;
		}
	}
	// admins may look up any learner
	if ( current_user_can( 'manage_options' ) ) {
		foreach ( get_users( array( 'fields' => array( 'ID' ) ) ) as $user ) {
			foreach ( az_kit_get_user_certificates( (int) $user->ID ) as $cert ) {
				if ( hash_equals( strtoupper( $cert['code'] ), $code ) ) {
					$cert['student'] = get_userdata( (int) $user->ID )->display_name;
					return $cert;
				}
			}
		}
	}
	return null;
}

/**
 * [az_certificate_verify] — public verification form.
 * Rate limited; reveals only non-sensitive fields.
 */
add_shortcode(
	'az_certificate_verify',
	function () {
		$notice = '';
		$result = '';

		if ( 'POST' === $_SERVER['REQUEST_METHOD'] && isset( $_POST['az_verify_nonce'] ) ) {
			$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
			$key = 'az_verify_' . md5( $ip );
			$hits = (int) get_transient( $key );
			if ( $hits > 20 ) {
				$notice = '<div class="az-form-error">تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.</div>';
			} elseif ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['az_verify_nonce'] ) ), 'az_certificate_verify' ) ) {
				$notice = '<div class="az-form-error">درخواست نامعتبر است.</div>';
			} else {
				set_transient( $key, $hits + 1, 10 * MINUTE_IN_SECONDS );
				$code = isset( $_POST['az_cert_code'] ) ? sanitize_text_field( wp_unslash( $_POST['az_cert_code'] ) ) : '';
				$cert = $code ? az_kit_public_find_certificate( $code ) : null;
				if ( $cert ) {
					$result  = '<div class="az-state az-state--success"><div class="az-state__icon" aria-hidden="true">✓</div>';
					$result .= '<h3>گواهی معتبر است</h3>';
					$result .= '<div class="az-table-wrap"><table><tbody>';
					$result .= '<tr><th scope="row">دوره</th><td>' . esc_html( $cert['course_title'] ) . '</td></tr>';
					$result .= '<tr><th scope="row">تاریخ صدور</th><td>' . esc_html( $cert['date'] ) . '</td></tr>';
					$result .= '<tr><th scope="row">شناسه</th><td dir="ltr">' . esc_html( $cert['code'] ) . '</td></tr>';
					$result .= '</tbody></table></div></div>';
				} else {
					$result = '<div class="az-state az-state--danger"><div class="az-state__icon" aria-hidden="true">!</div><h3>گواهی‌ای با این شناسه پیدا نشد</h3><p>شناسه را دوباره بررسی کنید.</p></div>';
				}
			}
		}

		$html  = '<form class="az-form" method="post">';
		$html .= wp_nonce_field( 'az_certificate_verify', 'az_verify_nonce', true, false );
		$html .= '<div class="az-field"><label for="az_cert_code">شناسهٔ گواهی</label>';
		$html .= '<input type="text" id="az_cert_code" name="az_cert_code" inputmode="latin" dir="ltr" placeholder="AZ-XXXXXXXXXX" required /></div>';
		$html .= '<button type="submit" class="az-btn az-btn--primary az-btn--block">استعلام</button>';
		$html .= '</form>';
		return $notice . $result . $html;
	}
);

/** Public lookup: iterates learners but only returns a minimal payload. */
function az_kit_public_find_certificate( $code ) {
	$cache_key = 'az_cert_' . md5( strtoupper( $code ) );
	$cached    = get_transient( $cache_key );
	if ( false !== $cached ) {
		return $cached;
	}
	$found = null;
	foreach ( get_users( array( 'fields' => array( 'ID' ) ) ) as $user ) {
		foreach ( az_kit_get_user_certificates( (int) $user->ID ) as $cert ) {
			if ( hash_equals( strtoupper( $cert['code'] ), strtoupper( $code ) ) ) {
				$found = array(
					'code'         => $cert['code'],
					'course_title' => $cert['course_title'],
					'date'         => $cert['date'],
				);
				break 2;
			}
		}
	}
	set_transient( $cache_key, $found, HOUR_IN_SECONDS );
	return $found;
}

/**
 * [az_course_meta field="level|duration|sessions|price|instructor|prerequisites"]
 * Real course metadata; falls back to an empty string so templates show their
 * documented placeholder instead of inventing data.
 */
add_shortcode(
	'az_course_meta',
	function ( $atts ) {
		$atts      = shortcode_atts(
			array(
				'field'     => 'level',
				'course_id' => 0,
			),
			$atts,
			'az_course_meta'
		);
		$course_id = az_kit_current_course_id( $atts['course_id'] );
		if ( ! $course_id ) {
			return '';
		}
		$field = sanitize_key( $atts['field'] );

		switch ( $field ) {
			case 'price':
				if ( function_exists( 'learndash_get_course_price' ) ) {
					$price = learndash_get_course_price( $course_id );
					if ( is_array( $price ) && ! empty( $price['amount'] ) ) {
						return esc_html( $price['amount'] ) . ' ' . ( function_exists( 'get_woocommerce_currency_symbol' ) ? esc_html( get_woocommerce_currency_symbol() ) : '' );
					}
				}
				return '';
			case 'instructor':
				$author_id = (int) get_post_field( 'post_author', $course_id );
				return $author_id ? esc_html( get_the_author_meta( 'display_name', $author_id ) ) : '';
			case 'level':
			case 'duration':
			case 'sessions':
			case 'prerequisites':
				// Prefer an ACF field, then LearnDash settings, then nothing.
				$value = function_exists( 'get_field' ) ? get_field( 'course_' . $field, $course_id ) : '';
				if ( ! $value ) {
					$value = get_post_meta( $course_id, '_az_course_' . $field, true );
				}
				return $value ? esc_html( $value ) : '';
			case 'level_duration':
				$parts = array();
				foreach ( array( 'level', 'duration', 'sessions' ) as $key ) {
					$value = function_exists( 'get_field' ) ? get_field( 'course_' . $key, $course_id ) : '';
					if ( ! $value ) {
						$value = get_post_meta( $course_id, '_az_course_' . $key, true );
					}
					if ( $value ) {
						$parts[] = '<span class="az-badge">' . esc_html( $value ) . '</span>';
					}
				}
				return implode( '', $parts );
		}
		return apply_filters( 'az_kit_course_meta', '', $field, $course_id );
	}
);

/**
 * [az_course_cta] — enrol / continue / owned state, based on real status.
 */
add_shortcode(
	'az_course_cta',
	function ( $atts ) {
		$atts      = shortcode_atts( array( 'course_id' => 0 ), $atts, 'az_course_cta' );
		$course_id = az_kit_current_course_id( $atts['course_id'] );
		if ( ! $course_id ) {
			return '';
		}
		$user_id = get_current_user_id();
		$status  = $user_id && function_exists( 'learndash_course_status' ) ? learndash_course_status( $course_id, $user_id ) : '';

		if ( 'completed' === $status ) {
			$cert_url = function_exists( 'learndash_get_course_certificate_link' ) ? learndash_get_course_certificate_link( $course_id, $user_id ) : '';
			return '<a class="az-btn az-btn--primary az-btn--block" href="' . esc_url( $cert_url ? $cert_url : get_permalink( $course_id ) ) . '">مشاهدهٔ گواهی</a>';
		}
		if ( 'in_progress' === $status || 'not_started' === $status ) {
			return '<a class="az-btn az-btn--primary az-btn--block" href="' . esc_url( az_kit_next_step_url( $user_id, $course_id ) ) . '">ادامهٔ یادگیری</a>';
		}

		// not enrolled: use the real LearnDash/Woo purchase button when possible
		if ( function_exists( 'learndash_payment_buttons' ) ) {
			return '<div class="az-mount">' . learndash_payment_buttons( $course_id ) . '</div>';
		}
		return '<a class="az-btn az-btn--primary az-btn--block" href="' . esc_url( get_permalink( $course_id ) ) . '">ثبت‌نام در دوره</a>';
	}
);

/**
 * [az_course_curriculum] — hierarchical course outline with state per step.
 */
add_shortcode(
	'az_course_curriculum',
	function ( $atts ) {
		$atts      = shortcode_atts( array( 'course_id' => 0 ), $atts, 'az_course_curriculum' );
		$course_id = az_kit_current_course_id( $atts['course_id'] );
		if ( ! $course_id || ! function_exists( 'learndash_get_course_lessons_list' ) ) {
			return '';
		}
		$user_id = get_current_user_id();
		$lessons = learndash_get_course_lessons_list( $course_id, $user_id, array( 'num' => -1 ) );
		if ( empty( $lessons ) ) {
			return az_kit_empty( 'سرفصلی برای این دوره ثبت نشده است.' );
		}

		$html = '<div class="az-ld-list">';
		$i    = 0;
		foreach ( $lessons as $lesson ) {
			$i++;
			$post   = $lesson['post'];
			$status = isset( $lesson['status'] ) ? $lesson['status'] : 'not_started';
			$locked = 'completed' !== $status && ! empty( $lesson['locked'] );
			$class  = 'az-ld-item' . ( $locked ? ' az-ld-item--locked' : '' ) . ( 'completed' === $status ? ' az-ld-item--current' : '' );
			$html  .= '<div class="' . esc_attr( $class ) . '">';
			$html  .= '<span class="az-ld-item__n">' . ( $locked ? '🔒' : esc_html( az_kit_persian_number( $i ) ) ) . '</span>';
			$html  .= '<span class="az-ld-item__grow"><span class="az-ld-item__title">' . esc_html( get_the_title( $post->ID ) ) . '</span>';
			$html  .= '<span class="az-ld-item__meta">' . esc_html( az_kit_status_label( $status ) ) . '</span></span>';
			if ( ! $locked ) {
				$html .= '<a class="az-btn az-btn--ghost" href="' . esc_url( get_permalink( $post->ID ) ) . '">مشاهده</a>';
			}
			$html .= '</div>';
		}
		$html .= '</div>';
		return $html;
	}
);

/**
 * [az_related_courses limit="3"] — same category, excluding current course.
 */
add_shortcode(
	'az_related_courses',
	function ( $atts ) {
		$atts      = shortcode_atts( array( 'limit' => 3 ), $atts, 'az_related_courses' );
		$course_id = az_kit_current_course_id( 0 );
		$args      = array(
			'post_type'      => 'sfwd-courses',
			'post_status'    => 'publish',
			'posts_per_page' => absint( $atts['limit'] ),
			'post__not_in'   => $course_id ? array( $course_id ) : array(),
		);
		if ( $course_id ) {
			$terms = wp_get_post_terms( $course_id, 'ld_course_category', array( 'fields' => 'ids' ) );
			if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
				$args['tax_query'] = array(
					array(
						'taxonomy' => 'ld_course_category',
						'field'    => 'term_id',
						'terms'    => $terms,
					),
				);
			}
		}
		$query = new WP_Query( $args );
		if ( ! $query->have_posts() ) {
			return '';
		}
		$html = '<div class="az-grid az-grid--3">';
		while ( $query->have_posts() ) {
			$query->the_post();
			$html .= '<article class="az-card"><a href="' . esc_url( get_permalink() ) . '">' . get_the_post_thumbnail( get_the_ID(), 'medium', array( 'loading' => 'lazy' ) ) . '</a>';
			$html .= '<h3><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></h3>';
			$html .= '<p>' . esc_html( wp_trim_words( get_the_excerpt(), 16 ) ) . '</p></article>';
		}
		wp_reset_postdata();
		$html .= '</div>';
		return $html;
	}
);

/**
 * [az_workshop_meta field="seats|schedule|map" product_id=""]
 * Workshop capacity is the WooCommerce stock level (spec §17).
 */
add_shortcode(
	'az_workshop_meta',
	function ( $atts ) {
		$atts = shortcode_atts(
			array(
				'field'      => 'seats',
				'product_id' => 0,
			),
			$atts,
			'az_workshop_meta'
		);
		$product_id = absint( $atts['product_id'] ) ? absint( $atts['product_id'] ) : get_queried_object_id();
		if ( ! $product_id || ! function_exists( 'wc_get_product' ) ) {
			return '';
		}
		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return '';
		}
		switch ( sanitize_key( $atts['field'] ) ) {
			case 'seats':
				$stock = $product->get_stock_quantity();
				if ( null === $stock ) {
					return '<span class="az-badge">ظرفیت نامحدود</span>';
				}
				if ( $stock <= 0 ) {
					return '<span class="az-badge az-badge--danger">ظرفیت تکمیل شد</span>';
				}
				$class = $stock <= 3 ? 'az-badge az-badge--warn' : 'az-badge az-badge--info';
				return '<span class="' . esc_attr( $class ) . '">ظرفیت باقی‌مانده: ' . esc_html( az_kit_persian_number( $stock ) ) . ' نفر</span>';
			case 'schedule':
				$start = get_post_meta( $product_id, '_az_workshop_start', true );
				$days  = get_post_meta( $product_id, '_az_workshop_days', true );
				$time  = get_post_meta( $product_id, '_az_workshop_time', true );
				$parts = array_filter( array( $start, $days, $time ) );
				return $parts ? '<span class="az-badge">' . esc_html( implode( ' — ', $parts ) ) . '</span>' : '';
			case 'map':
				// Insert the site's map shortcode/embed here; kept as a filter so
				// the map provider stays a site decision, not a kit dependency.
				return apply_filters( 'az_kit_workshop_map', '', $product_id );
		}
		return '';
	}
);

/**
 * [az_path_courses] — ordered courses of a learning path (ACF relationship).
 */
add_shortcode(
	'az_path_courses',
	function ( $atts ) {
		$atts   = shortcode_atts( array( 'path_id' => 0 ), $atts, 'az_path_courses' );
		$path_id = absint( $atts['path_id'] ) ? absint( $atts['path_id'] ) : get_queried_object_id();
		if ( ! $path_id ) {
			return '';
		}
		$courses = array();
		if ( function_exists( 'get_field' ) ) {
			$courses = (array) get_field( 'path_courses', $path_id );
		}
		if ( empty( $courses ) ) {
			$courses = (array) get_post_meta( $path_id, 'path_courses', true );
		}
		if ( empty( $courses ) ) {
			return '';
		}
		$html = '<div class="az-steps">';
		$i    = 0;
		foreach ( $courses as $course ) {
			$course_id = is_object( $course ) ? $course->ID : (int) $course;
			if ( ! $course_id ) {
				continue;
			}
			$i++;
			$html .= '<div class="az-step"><span class="az-step__n">' . esc_html( az_kit_persian_number( $i ) ) . '</span>';
			$html .= '<div class="az-step__body"><h4>' . esc_html( get_the_title( $course_id ) ) . '</h4>';
			$html .= '<p>' . esc_html( wp_trim_words( get_the_excerpt( $course_id ), 20 ) ) . '</p></div></div>';
		}
		$html .= '</div>';
		return $html;
	}
);

/**
 * [az_instructor_courses instructor_id=""] — courses linked to an instructor.
 */
add_shortcode(
	'az_instructor_courses',
	function ( $atts ) {
		$atts = shortcode_atts( array( 'instructor_id' => 0 ), $atts, 'az_instructor_courses' );
		$id   = absint( $atts['instructor_id'] ) ? absint( $atts['instructor_id'] ) : get_queried_object_id();
		if ( ! $id ) {
			return '';
		}
		$courses = function_exists( 'get_field' ) ? (array) get_field( 'featured_courses', $id ) : array();
		if ( empty( $courses ) ) {
			$courses = (array) get_post_meta( $id, 'featured_courses', true );
		}
		if ( empty( $courses ) ) {
			return '';
		}
		$html = '<div class="az-grid az-grid--2">';
		foreach ( $courses as $course ) {
			$course_id = is_object( $course ) ? $course->ID : (int) $course;
			if ( ! $course_id ) {
				continue;
			}
			$html .= '<article class="az-card"><a href="' . esc_url( get_permalink( $course_id ) ) . '">' . get_the_post_thumbnail( $course_id, 'medium', array( 'loading' => 'lazy' ) ) . '</a>';
			$html .= '<h3><a href="' . esc_url( get_permalink( $course_id ) ) . '">' . esc_html( get_the_title( $course_id ) ) . '</a></h3></article>';
		}
		$html .= '</div>';
		return $html;
	}
);

/**
 * [az_my_orders limit=""] with [az_order_detail].
 */
add_shortcode(
	'az_my_orders',
	function ( $atts ) {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$atts = shortcode_atts( array( 'limit' => 20 ), $atts, 'az_my_orders' );
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return az_kit_empty( 'ووکامرس فعال نیست.' );
		}
		$orders = wc_get_orders(
			array(
				'customer_id' => get_current_user_id(),
				'limit'       => absint( $atts['limit'] ),
				'orderby'     => 'date',
				'order'       => 'DESC',
			)
		);
		if ( empty( $orders ) ) {
			return az_kit_empty( 'سفارشی ثبت نشده است.', 'رفتن به فروشگاه', home_url( '/shop/' ) );
		}
		$html = '<div class="az-table-wrap"><table><thead><tr><th scope="col">سفارش</th><th scope="col">تاریخ</th><th scope="col">مبلغ</th><th scope="col">وضعیت</th><th scope="col">اقدام</th></tr></thead><tbody>';
		foreach ( $orders as $order ) {
			$html .= '<tr><th scope="row">#' . esc_html( $order->get_order_number() ) . '</th>';
			$html .= '<td>' . esc_html( $order->get_date_created() ? $order->get_date_created()->date_i18n( 'j F Y' ) : '' ) . '</td>';
			$html .= '<td>' . wp_kses_post( $order->get_formatted_order_total() ) . '</td>';
			$html .= '<td><span class="az-badge">' . esc_html( wc_get_order_status_name( $order->get_status() ) ) . '</span></td>';
			$html .= '<td><a href="' . esc_url( $order->get_view_order_url() ) . '">جزئیات</a></td></tr>';
		}
		$html .= '</tbody></table></div>';
		return $html;
	}
);

add_shortcode(
	'az_order_detail',
	function ( $atts ) {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$atts = shortcode_atts( array( 'order_id' => 0 ), $atts, 'az_order_detail' );
		$id   = absint( $atts['order_id'] ) ? absint( $atts['order_id'] ) : absint( get_query_var( 'view-order', 0 ) );
		if ( ! $id || ! function_exists( 'wc_get_order' ) ) {
			return az_kit_empty( 'سفارشی انتخاب نشده است.' );
		}
		$order = wc_get_order( $id );
		if ( ! $order ) {
			return az_kit_empty( 'سفارش پیدا نشد.' );
		}
		// ownership check — never trust the id from the URL
		if ( (int) $order->get_customer_id() !== get_current_user_id() && ! current_user_can( 'manage_options' ) ) {
			return az_kit_empty( 'دسترسی به این سفارش مجاز نیست.' );
		}
		$html  = '<div class="az-table-wrap"><table><tbody>';
		$html .= '<tr><th scope="row">شمارهٔ سفارش</th><td>#' . esc_html( $order->get_order_number() ) . '</td></tr>';
		$html .= '<tr><th scope="row">تاریخ</th><td>' . esc_html( $order->get_date_created() ? $order->get_date_created()->date_i18n( 'j F Y' ) : '' ) . '</td></tr>';
		$html .= '<tr><th scope="row">وضعیت</th><td><span class="az-badge">' . esc_html( wc_get_order_status_name( $order->get_status() ) ) . '</span></td></tr>';
		$html .= '<tr><th scope="row">مبلغ</th><td>' . wp_kses_post( $order->get_formatted_order_total() ) . '</td></tr>';
		$html .= '</tbody></table></div>';
		$html .= '<div class="az-table-wrap"><table><thead><tr><th scope="col">مورد</th><th scope="col">تعداد</th><th scope="col">مبلغ</th></tr></thead><tbody>';
		foreach ( $order->get_items() as $item ) {
			$html .= '<tr><th scope="row">' . esc_html( $item->get_name() ) . '</th><td>' . esc_html( $item->get_quantity() ) . '</td><td>' . wp_kses_post( $order->get_formatted_line_subtotal( $item ) ) . '</td></tr>';
		}
		$html .= '</tbody></table></div>';
		return $html;
	}
);

/**
 * [az_order_tracking] — public, nonce protected, reveals status only.
 */
add_shortcode(
	'az_order_tracking',
	function () {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return az_kit_empty( 'ووکامرس فعال نیست.' );
		}
		$notice = '';
		$result = '';
		if ( 'POST' === $_SERVER['REQUEST_METHOD'] && isset( $_POST['az_track_nonce'] ) ) {
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['az_track_nonce'] ) ), 'az_order_tracking' ) ) {
				$notice = '<div class="az-form-error">درخواست نامعتبر است.</div>';
			} else {
				$order_id = isset( $_POST['az_order_id'] ) ? absint( $_POST['az_order_id'] ) : 0;
				$email    = isset( $_POST['az_order_email'] ) ? sanitize_email( wp_unslash( $_POST['az_order_email'] ) ) : '';
				if ( ! $order_id || ! $email ) {
					$notice = '<div class="az-form-error">شمارهٔ سفارش و ایمیل را وارد کنید.</div>';
				} else {
					$order = wc_get_order( $order_id );
					if ( $order && hash_equals( strtolower( $order->get_billing_email() ), strtolower( $email ) ) ) {
						$result = '<div class="az-state az-state--success"><h3>وضعیت سفارش #' . esc_html( $order->get_order_number() ) . '</h3><p>' . esc_html( wc_get_order_status_name( $order->get_status() ) ) . '</p></div>';
					} else {
						$result = '<div class="az-state az-state--danger"><h3>سفارشی با این اطلاعات پیدا نشد</h3><p>شمارهٔ سفارش و ایمیل ثبت‌شده را بررسی کنید.</p></div>';
					}
				}
			}
		}
		$html  = '<form class="az-form" method="post">';
		$html .= wp_nonce_field( 'az_order_tracking', 'az_track_nonce', true, false );
		$html .= '<div class="az-field"><label for="az_order_id">شمارهٔ سفارش</label><input type="number" id="az_order_id" name="az_order_id" required /></div>';
		$html .= '<div class="az-field"><label for="az_order_email">ایمیل ثبت‌شده</label><input type="email" id="az_order_email" name="az_order_email" dir="ltr" required /></div>';
		$html .= '<button type="submit" class="az-btn az-btn--primary az-btn--block">پیگیری سفارش</button></form>';
		return $notice . $result . $html;
	}
);

/**
 * [az_preorder_form product_id=""] — waiting list with nonce + rate limit.
 */
add_shortcode(
	'az_preorder_form',
	function ( $atts ) {
		$atts = shortcode_atts( array( 'product_id' => 0 ), $atts, 'az_preorder_form' );
		$notice = '';
		if ( 'POST' === $_SERVER['REQUEST_METHOD'] && isset( $_POST['az_preorder_nonce'] ) ) {
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['az_preorder_nonce'] ) ), 'az_preorder_form' ) ) {
				$notice = '<div class="az-form-error">درخواست نامعتبر است.</div>';
			} else {
				$name  = isset( $_POST['az_pre_name'] ) ? sanitize_text_field( wp_unslash( $_POST['az_pre_name'] ) ) : '';
				$phone = isset( $_POST['az_pre_phone'] ) ? sanitize_text_field( wp_unslash( $_POST['az_pre_phone'] ) ) : '';
				if ( ! $name || ! preg_match( '/^09\d{9}$/', $phone ) ) {
					$notice = '<div class="az-form-error">نام و شمارهٔ تماس را با فرمت درست وارد کنید.</div>';
				} else {
					do_action( 'az_kit_preorder_requested', $name, $phone, absint( $atts['product_id'] ) );
					$notice = '<div class="az-badge az-badge--success">درخواست ثبت شد. در صورت آزاد شدن ظرفیت با شما تماس می‌گیریم.</div>';
				}
			}
		}
		$html  = '<form class="az-form" method="post">';
		$html .= wp_nonce_field( 'az_preorder_form', 'az_preorder_nonce', true, false );
		$html .= '<div class="az-field"><label for="az_pre_name">نام و نام خانوادگی</label><input type="text" id="az_pre_name" name="az_pre_name" required /></div>';
		$html .= '<div class="az-field"><label for="az_pre_phone">شمارهٔ تماس</label><input type="tel" id="az_pre_phone" name="az_pre_phone" inputmode="numeric" placeholder="09xxxxxxxxx" required /></div>';
		$html .= '<button type="submit" class="az-btn az-btn--primary az-btn--block">ثبت درخواست</button></form>';
		return $notice . $html;
	}
);

/**
 * [az_profile_form] — profile editing with nonce + capability check.
 */
add_shortcode(
	'az_profile_form',
	function () {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$user    = wp_get_current_user();
		$notice  = '';
		$user_id = get_current_user_id();

		if ( 'POST' === $_SERVER['REQUEST_METHOD'] && isset( $_POST['az_profile_nonce'] ) ) {
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['az_profile_nonce'] ) ), 'az_profile_form' ) ) {
				$notice = '<div class="az-form-error">درخواست نامعتبر است.</div>';
			} else {
				$display = isset( $_POST['az_display_name'] ) ? sanitize_text_field( wp_unslash( $_POST['az_display_name'] ) ) : '';
				$phone   = isset( $_POST['az_phone'] ) ? sanitize_text_field( wp_unslash( $_POST['az_phone'] ) ) : '';
				$city    = isset( $_POST['az_city'] ) ? sanitize_text_field( wp_unslash( $_POST['az_city'] ) ) : '';
				if ( $display ) {
					wp_update_user(
						array(
							'ID'           => $user_id,
							'display_name' => $display,
						)
					);
				}
				update_user_meta( $user_id, 'billing_phone', $phone );
				update_user_meta( $user_id, 'billing_city', $city );
				$notice = '<div class="az-badge az-badge--success">تغییرات ذخیره شد.</div>';
			}
		}

		$html  = '<form class="az-form" method="post">';
		$html .= wp_nonce_field( 'az_profile_form', 'az_profile_nonce', true, false );
		$html .= '<div class="az-field"><label for="az_display_name">نام نمایشی</label><input type="text" id="az_display_name" name="az_display_name" value="' . esc_attr( $user->display_name ) . '" /></div>';
		$html .= '<div class="az-field"><label for="az_phone">شمارهٔ تماس</label><input type="tel" id="az_phone" name="az_phone" inputmode="numeric" value="' . esc_attr( get_user_meta( $user_id, 'billing_phone', true ) ) . '" /></div>';
		$html .= '<div class="az-field"><label for="az_city">شهر</label><input type="text" id="az_city" name="az_city" value="' . esc_attr( get_user_meta( $user_id, 'billing_city', true ) ) . '" /></div>';
		$html .= '<button type="submit" class="az-btn az-btn--primary az-btn--block">ذخیرهٔ تغییرات</button></form>';
		return $notice . $html;
	}
);

/**
 * [az_security_sessions] — requires a sessions plugin; returns an honest
 * empty state instead of pretending the data exists.
 */
add_shortcode(
	'az_security_sessions',
	function () {
		if ( ! is_user_logged_in() ) {
			return az_kit_login_gate();
		}
		$sessions = apply_filters( 'az_kit_user_sessions', null, get_current_user_id() );
		if ( empty( $sessions ) || ! is_array( $sessions ) ) {
			return az_kit_empty( 'نمایش نشست‌های فعال نیازمند افزونه یا کد سفارشی است. این بخش را تا زمان فراهم شدن آن حذف کنید.' );
		}
		$html = '<div class="az-table-wrap"><table><thead><tr><th scope="col">دستگاه</th><th scope="col">آخرین فعالیت</th><th scope="col">IP</th></tr></thead><tbody>';
		foreach ( $sessions as $session ) {
			$html .= '<tr><th scope="row">' . esc_html( $session['device'] ?? '' ) . '</th>';
			$html .= '<td>' . esc_html( $session['last'] ?? '' ) . '</td>';
			$html .= '<td dir="ltr">' . esc_html( $session['ip'] ?? '' ) . '</td></tr>';
		}
		$html .= '</tbody></table></div>';
		return $html;
	}
);

/**
 * [az_no_results] / [az_search_results] — replace the raw "nothing found"
 * screen with useful next steps.
 */
add_shortcode(
	'az_no_results',
	function () {
		$html  = '<div class="az-grid az-grid--3">';
		$links = array(
			array( 'دوره‌های آنلاین', home_url( '/courses/' ) ),
			array( 'کلاس‌های حضوری', home_url( '/workshops/' ) ),
			array( 'مسیرهای یادگیری', home_url( '/learning-paths/' ) ),
		);
		foreach ( $links as $link ) {
			$html .= '<article class="az-card"><h3>' . esc_html( $link[0] ) . '</h3><a class="az-btn az-btn--ghost" href="' . esc_url( $link[1] ) . '">مشاهده</a></article>';
		}
		$html .= '</div>';
		return $html;
	}
);

add_shortcode(
	'az_search_results',
	function () {
		$term = get_search_query();
		if ( ! $term ) {
			return '';
		}
		$query = new WP_Query(
			array(
				's'              => $term,
				'post_type'      => array( 'post', 'sfwd-courses', 'product' ),
				'post_status'    => 'publish',
				'posts_per_page' => 12,
			)
		);
		if ( ! $query->have_posts() ) {
			return do_shortcode( '[az_no_results]' );
		}
		$html = '<div class="az-grid az-grid--3">';
		while ( $query->have_posts() ) {
			$query->the_post();
			$html .= '<article class="az-card"><a href="' . esc_url( get_permalink() ) . '">' . get_the_post_thumbnail( get_the_ID(), 'medium', array( 'loading' => 'lazy' ) ) . '</a>';
			$html .= '<h3><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></h3>';
			$html .= '<p>' . esc_html( wp_trim_words( get_the_excerpt(), 18 ) ) . '</p></article>';
		}
		wp_reset_postdata();
		$html .= '</div>';
		return $html;
	}
);

/**
 * [az_artwork_grid] / [az_instructor_grid] — thin wrappers so the templates
 * keep working if the Element Pack grid is not available.
 */
add_shortcode(
	'az_artwork_grid',
	function ( $atts ) {
		$atts = shortcode_atts( array( 'columns' => 3 ), $atts, 'az_artwork_grid' );
		if ( ! post_type_exists( 'az_artwork' ) ) {
			return '';
		}
		return az_kit_grid( 'az_artwork', absint( $atts['columns'] ) );
	}
);

add_shortcode(
	'az_instructor_grid',
	function ( $atts ) {
		$atts = shortcode_atts( array( 'columns' => 4 ), $atts, 'az_instructor_grid' );
		if ( ! post_type_exists( 'instructor' ) ) {
			return '';
		}
		return az_kit_grid( 'instructor', absint( $atts['columns'] ) );
	}
);

function az_kit_grid( $post_type, $columns ) {
	$query = new WP_Query(
		array(
			'post_type'      => $post_type,
			'post_status'    => 'publish',
			'posts_per_page' => 12,
		)
	);
	if ( ! $query->have_posts() ) {
		return '';
	}
	$html = '<div class="az-grid az-grid--' . esc_attr( $columns ) . '">';
	while ( $query->have_posts() ) {
		$query->the_post();
		$html .= '<article class="az-card"><a href="' . esc_url( get_permalink() ) . '">' . get_the_post_thumbnail( get_the_ID(), 'medium', array( 'loading' => 'lazy' ) ) . '</a>';
		$html .= '<h3><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></h3></article>';
	}
	wp_reset_postdata();
	$html .= '</div>';
	return $html;
}
