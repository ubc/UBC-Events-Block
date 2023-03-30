/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

import { PanelBody, SelectControl, __experimentalNumberControl as NumberControl, CheckboxControl } from '@wordpress/components';
import { TaxonomyItem, useCategories, useOrganizers, useVenues, getEvents } from './components';
import { renderEvents } from './events';
import { useEffect, useState, Fragment } from "@wordpress/element";

const MAX_POST_PER_PAGE = 50;

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {WPElement} Element to render.
 */
export default function Edit( props ) {
	const { attributes, setAttributes } = props;
	const {
		viewType,
		postPerPage,
		selectedCategories,
		selectedOrganizers,
		selectedVenues,
		pagination
	} = attributes;
	const blockProps = useBlockProps();

	const [categories, setCategories] = useState([]);
	const [organizers, setOrganizers] = useState([]);
	const [venues, setVenues]         = useState([]);
	const [events, setEvents]         = useState([]);

	useEffect( () => {
		const fetchFilterData = async() => {
			const categories = await useCategories();
			const organizers = await useOrganizers();
			const venues     = await useVenues();

			setCategories(categories);
			setOrganizers(organizers);
			setVenues(venues);
		}

		fetchFilterData();
	}, [])

	useEffect( () => {
		const fetchEvents = async() => {
			let eventsData = [];

			if( 'calendar' === viewType ) {
				eventsData = await getEvents(
					{
						per_page: MAX_POST_PER_PAGE,
						categories: selectedCategories.join(','),
						organizer: selectedOrganizers.join(','),
						venue: selectedVenues.join(','),
						status: 'publish'
					},
					true
				);
				console.log(eventsData);
			} else {
				eventsData = await getEvents( {
					per_page: postPerPage,
					categories: selectedCategories.join(','),
					organizer: selectedOrganizers.join(','),
					venue: selectedVenues.join(','),
					status: 'publish'
				});
			}
	
			setEvents( eventsData );
		}

		fetchEvents();

	}, [ postPerPage, selectedCategories, selectedOrganizers, selectedVenues, viewType ]);
	
	return (
		<div { ...blockProps }>
			{ renderEvents( events, viewType ) }
			<InspectorControls>
				<PanelBody title="Settings" initialOpen={ false }>
					<SelectControl
						label="View Type"
						value={ viewType }
						options={ [
							{ label: 'List', value: 'list' },
							{ label: 'Calendar', value: 'calendar' },
						] }
						onChange={ ( newViewType ) => {
							setAttributes( {
								viewType: newViewType,
							} );
						} }
						help={ __(
							'Choose the way to render the events.'
						) }
						__nextHasNoMarginBottom
					/>

					{
						'calendar' !== viewType ?
						<Fragment>
							<NumberControl
								label="Post Per Page"
								className="components-base-control"
								min={1}
								max={MAX_POST_PER_PAGE}
								isShiftStepEnabled={ false }
								onChange={ ( newPostPerPage ) => {
									setAttributes( {
										postPerPage: ! newPostPerPage || isNaN( newPostPerPage ) ? 10 : parseInt( newPostPerPage ),
									} );
								} }
								step={ 1 }
								value={ postPerPage }
							/>
							<CheckboxControl
								label="Enable Pagination"
								help="Enabled pagination to show all events or just showing most recent events"
								checked={ pagination }
								onChange={ newPagination => {
									setAttributes({
										pagination: newPagination
									});
								} }
							/>
						</Fragment>
						: null
					}
				</PanelBody>
				<PanelBody title="Filters" initialOpen={ false }>
					<TaxonomyItem
						key='categories'
						taxonomy_label='Categories'
						name_field='name'
						terms={ categories }
						value={ selectedCategories }
						onChange={ terms => {
							setAttributes({
								selectedCategories: terms
							});
						}}
					/>
					<TaxonomyItem
						key='organizers'
						taxonomy_label='Organizers'
						name_field='organizer'
						terms={ organizers }
						value={ selectedOrganizers }
						onChange={ terms => {
							setAttributes({
								selectedOrganizers: terms
							});
						}}
					/>
					<TaxonomyItem
						key='venues'
						taxonomy_label='Venues'
						name_field='venue'
						terms={ venues }
						value={ selectedVenues }
						onChange={ terms => {
							setAttributes({
								selectedVenues: terms
							});
						}}
					/>
				</PanelBody>
			</InspectorControls>
		</div>
	);
}