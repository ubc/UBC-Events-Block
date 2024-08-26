<?php
/**
 * Plugin Name:       UBC Event Block
 * Description:       Allow users to display events from UBC events API.
 * Requires at least: 5.9
 * Requires PHP:      7.0
 * Version:           1.0.0
 * Author:            Kelvin Xu
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       ubc-eventh-block
 *
 * @package           ubc-eventh-block
 */

namespace UBC\CTLT\Block\UBCEvent;

define( 'UBC_EVENT_BLOCK_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'UBC_EVENT_BLOCK_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

define( 'UBC_EVENT_ENDPOINT', 'https://events.ubc.ca/wp-json/tribe/events/v1/events' );
define( 'UBC_EVENT_CATEGORIES_ENDPOINT', 'https://events.ubc.ca/wp-json/tribe/events/v1/categories' );
define( 'UBC_EVENT_ORGANIZERS_ENDPOINT', 'https://events.ubc.ca/wp-json/tribe/events/v1/organizers' );
define( 'UBC_EVENT_VENUES_ENDPOINT', 'https://events.ubc.ca/wp-json/tribe/events/v1/venues' );

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function init() {
	add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_frontend_scripts' );
	add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\localize_to_editor_script' );

	register_block_type(
		__DIR__ . '/build',
		array(
			'render_callback' => __NAMESPACE__ . '\\render_events',
		)
	);
}

/**
 * Localize PHP variables to editor script.
 */
function localize_to_editor_script() {
	wp_localize_script(
		'ubc-event-block-editor-script',
		'ubc_event_block',
		array(
			'event_endpoint'      => UBC_EVENT_ENDPOINT,
			'categories_endpoint' => UBC_EVENT_CATEGORIES_ENDPOINT,
			'organizers_endpoint' => UBC_EVENT_ORGANIZERS_ENDPOINT,
			'venues_endpoint'     => UBC_EVENT_VENUES_ENDPOINT,
		)
	);
}

/**
 * Enqueue frontend scripts if block instance exists within post content.
 *
 * @return void
 */
function enqueue_frontend_scripts() {

	if ( ! has_block( 'ubc/event-block', $post->post_content ) ) {
		return;
	}

	wp_enqueue_script(
		'full_calendar_script',
		UBC_EVENT_BLOCK_PLUGIN_URL . 'src/full-calendar.js',
		array(),
		filemtime( UBC_EVENT_BLOCK_PLUGIN_DIR . 'src/full-calendar.js' ),
		false
	);
}

/**
 * Render the content of the UBC event block in the frontend.
 *
 * @param array    $attributes existing block attributes.
 * @param string   $content block content.
 * @param WP_Block $block Block type settings.
 *
 * @return HTML
 */
function render_events( $attributes, $content, $block ) {

	if ( 'calendar' === $attributes['viewType'] ) {
		return render_events_calendar( $attributes );
	}

	if ( 'list' === $attributes['viewType'] ) {
		return render_events_list( $attributes );
	}

}

/**
 * Render events to the frontend with calendar view.
 *
 * @param array $attributes existing block attributes.
 *
 * @return HTML
 */
function render_events_calendar( $attributes ) {

	$id               = uniqid();
	$events           = get_events(
		array(
			'per_page'   => 50,
			'categories' => implode( ',', $attributes['selectedCategories'] ),
			'organizer'  => implode( ',', $attributes['selectedOrganizers'] ),
			'venue'      => implode( ',', $attributes['selectedVenues'] ),
			'status'     => 'publish',
		),
		true
	);
	$formatted_events = array_map(
		function( $event ) {
			return array(
				'title'  => wp_specialchars_decode( $event->title ),
				'start'  => $event->start_date,
				'end'    => $event->end_date,
				'allDay' => $event->all_day,
				'url'    => $event->url,
			);
		},
		$events
	);

	ob_start();
	?>
		<div id="ubc-events-block-<?php echo esc_attr( $id ); ?>"></div>
		<script>
			document.addEventListener('DOMContentLoaded', function() {
				var calendarEl = document.getElementById( "ubc-events-block-<?php echo esc_attr( $id ); ?>" );
				var calendar = new FullCalendar.Calendar(calendarEl, {
					initialView: 'dayGridMonth',
					events: <?php echo wp_json_encode( $formatted_events ); ?>,
					eventClick: function( info ) {
						if ( info.event.url ) {
							window.open( info.event.url );
							info.jsEvent.preventDefault();
						}
					}
				});
				calendar.render();
			});
		</script>
	<?php
	return ob_get_clean();
}

/**
 * Render events to the frontend with list view.
 *
 * @param array $attributes existing block attributes.
 *
 * @return HTML
 */
function render_events_list( $attributes ) {

	$current_page      = max( 1, get_query_var( 'paged' ) );
	$pagination        = boolval( $attributes['pagination'] );
	$use_feature_image = boolval( $attributes['useFeatureImage'] );

	$events       = get_events(
		array(
			'per_page'   => (int) $attributes['postPerPage'],
			'categories' => implode( ',', $attributes['selectedCategories'] ),
			'organizer'  => implode( ',', $attributes['selectedOrganizers'] ),
			'venue'      => implode( ',', $attributes['selectedVenues'] ),
			'status'     => 'publish',
			'page'       => $pagination ? (int) $current_page : 1,
		)
	);

	ob_start();
	?>
		<div class="ubc-events">
			<ul class="ubc-events__list">
				<?php
				foreach ( $events['data'] as $key => $event ) :
						$start_date = new \DateTime( $event->start_date, new \DateTimeZone( $event->timezone ) );
						$end_date   = new \DateTime( $event->end_date, new \DateTimeZone( $event->timezone ) );
					?>
					<li>
						<?php if ( $use_feature_image && false !== $event->image && isset( $event->image->url ) ) : ?>
							<a class="ubc-events__list__image" href="<?php echo esc_url_raw( $event->url ); ?>" target="_blank">
								<img
									class="ubc-events__list__image"
									src="<?php echo esc_url( $event->image->url ); ?>"
									alt="<?php echo esc_attr( $event->title ); ?>"
								/>
							</a>
						<?php endif; ?>
						<a class="ubc-events__list__title" href="<?php echo esc_url_raw( $event->url ); ?>" target="_blank">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zm80 64c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16H368c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H80z"/></svg>
							<h3><?php echo esc_textarea( wp_specialchars_decode( $event->title ) ); ?></h3>
						</a>
						<p class="ubc-events__list__date">
							<strong>Date</strong>: <?php echo esc_textarea( $start_date->format( 'F d, Y h:i A' ) ); ?> - <?php echo esc_textarea( $end_date->format( 'F d, Y h:i A' ) ); ?>
						</p>
					</li>
				<?php endforeach; ?>
			</ul>
			<?php
			$big = 999999;

			if ( $pagination ) {
				echo wp_kses_post(
					paginate_links(
						array(
							'base'    => str_replace( $big, '%#%', esc_url( get_pagenum_link( $big ) ) ),
							'format'  => '?paged=%#%',
							'current' => max( 1, get_query_var( 'paged' ) ),
							'total'   => $events['total_pages'],
							'type'    => 'list',
						)
					)
				);
			}
			?>
		</div>
	<?php
	return ob_get_clean();
}

/**
 * Pulls events information from event.ubc.ca based on the payload provided.
 *
 * @param object  $payload payload of the GET request.
 * @param boolean $recursive whether ignore pagination and load all events.
 *
 * @return array events array if recursive is true, multi-dimension array including total pages and data if recursive is false.
 */
function get_events( $payload, $recursive = false ) {
	$page        = 1;
	$payload_url = generate_request_payload( $payload, array( 'page' => $page ) );
	$response    = wp_remote_get( UBC_EVENT_ENDPOINT . '?' . $payload_url );
	$body        = json_decode( wp_remote_retrieve_body( $response ) );
	$data        = $body->events;

	if ( $recursive ) {
		while ( $page + 1 <= $body->total_pages ) {
			$payload_url = generate_request_payload( $payload, array( 'page' => $page + 1 ) );
			$response    = wp_remote_get( UBC_EVENT_ENDPOINT . '?' . $payload_url );
			$body        = json_decode( wp_remote_retrieve_body( $response ) );
			$data        = array_merge( $data, $body->events );
			$page ++;
		}
	}

	return $recursive ? $data : array(
		'data'        => $data,
		'total_pages' => $body->total_pages,
	);
}

/**
 * Generate request payload.
 *
 * @param array $payload request payload.
 * @param array $additional_payload additional parameters added to the payload.
 *
 * @return string mixed payload URL string.
 */
function generate_request_payload( $payload, $additional_payload ) {
	// Remove empty options.
	$payload = array_filter(
		$payload,
		function( $parameter ) {
			return ! empty( $parameter );
		}
	);

	// Add additional payload.
	$payload = array_merge( $additional_payload, $payload );

	// Format payload data.
	$payload = array_map(
		function( $parameter, $key ) {
			return $key . '=' . $parameter;
		},
		$payload,
		array_keys( $payload ),
	);

	return implode( '&', $payload );
}

/* --------------------------------------------------------------------------------------------------------------------------------------------------- */

add_action( 'plugin_loaded', __NAMESPACE__ . '\\init' );
