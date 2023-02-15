import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { EventIcon } from './icons';

import { dateI18n, getDate, gmdate, gmdateI18n } from "@wordpress/date";

/**
 * Render events.
 */
export const renderEvents = ( events, renderType ) => {
	switch( renderType ) {
		case 'list':
			return renderListEvents( events );
		case 'calendar':
		  	return renderCalendarEvents( events );
	}
}

/**
 * Render events as list.
 */
const renderListEvents = ( events ) => {
	return (
		<div className="ubc-events">
			<ul className="ubc-events__list">
				{ events.map( ( event, index ) => {
					const start_date = dateI18n( 'F d, Y h:i A', event.start_date, event.timezone );
					const end_date = dateI18n( 'F d, Y h:i A', event.end_date, event.timezone );

					return (
						<li key={ `${event.slug}-${index}` }>
							{
							/**
							 * Some of the events currently does not have image. It might affect the entire layout of the list.
							 * Leave it for later.
							 */

							/* event.image && event.image.url ?
							<img
								className="ubc-events__list__image"
								key={`${event.slug}_image`}
								src={ event.image.sizes.large ? event.image.sizes.large.url : event.image.url }
								alt={event.title}
							/> :
							'' */ }
							{ event.title ?
							<a
								className="ubc-events__list__title"
								href=""
							>
								<EventIcon />
								<h3
									dangerouslySetInnerHTML={{__html: event.title}}
								/>
							</a> :
							'' }
							{ start_date && end_date ?
							<p className='ubc-events__list__date'><strong>Date: {start_date} - {end_date}</strong></p> :
							'' }
						</li>
					);
				}) }
			</ul>

			{ /** Fake pagination as we don't expect the pagination to be working in the editor on purposely. */}
			<ul className="ubc-events__pagination">
				<li className="ubc-events__pagination__buttons">Previous Page</li>
				<li><a href="">1</a></li>
				<li><a href="">2</a></li>
				<li>3</li>
				<li><a href="">4</a></li>
				<li><a href="">5</a></li>
				<li>...</li>
				<li><a href="">8</a></li>
				<li className="ubc-events__pagination__buttons">Next Page</li>
			</ul>
		</div>
	);
}

/**
 * Render events as calendar.
 */
const renderCalendarEvents = ( events ) => {
	const formattedEvents = events.map( event => {
		return {
			title: event.title,
			start: event.start_date,
			end: event.end_date,
			allDay: event.all_day,
		}
	});

	return (
		<FullCalendar
			plugins={[ dayGridPlugin ]}
			initialView="dayGridMonth"
			events={formattedEvents}
		/>
	);
}