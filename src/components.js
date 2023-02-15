import { FormTokenField } from '@wordpress/components';
import { __, _n } from '@wordpress/i18n';

const CATEGORIES_ENDPOINT = ubc_event_block.categories_endpoint;
const ORGANIZERS_ENDPOINT = ubc_event_block.organizers_endpoint;
const VENUES_ENDPOINT     = ubc_event_block.venues_endpoint;
const EVENTS_ENDPOINT     = ubc_event_block.event_endpoint;

const MAX_FETCHED_TERMS = 100;

export const useCategories = async() => {
	return useEndpointData( CATEGORIES_ENDPOINT, 'categories' );
}

export const useOrganizers = async() => {
	return useEndpointData( ORGANIZERS_ENDPOINT, 'organizers' );
}

export const useVenues = async() => {
	return useEndpointData( VENUES_ENDPOINT, 'venues' );
}

const useEndpointData = async( endpoint, taxonomy ) => {
	let response = await fetch( endpoint );
	let responseJson = await response.json();
	let data = responseJson[taxonomy];

	while( responseJson.next_rest_url ) {
		response = await fetch( responseJson.next_rest_url );
		responseJson = await response.json();
		data = [ ...data, ...responseJson[taxonomy] ];
	}

	return data;
}

export const getEvents = async( payload, recursive = false ) => {
	let page = 1;
	let payloadURL = generateEventPayloadURL( payload, { page: page} );

	let response = await fetch( EVENTS_ENDPOINT + '?' + payloadURL );
	let responseJson = await response.json();
	let data = responseJson.events;

	if ( recursive ) {
		while( page + 1 <= responseJson.total_pages ) {
			payloadURL = generateEventPayloadURL( payload, { page: page + 1} );
			response = await fetch( EVENTS_ENDPOINT + '?' + payloadURL );
			responseJson = await response.json();
			data = [ ...data, ...responseJson.events ];
			page++;
		}
	}

	return data;
}

/**
 * Generate request payload.
 */
const generateEventPayloadURL = ( payload, addtionalPayload ) => {
	const newPayload = {};

	// Remove empty payload.
	for (const payloadProperty in payload) {
		if ( payload[payloadProperty] !== '' && payload[payloadProperty] !== [] ) {
			newPayload[payloadProperty] = payload[payloadProperty];
		}
	}

	for (const additionalPayloadProperty in addtionalPayload) {
		newPayload[additionalPayloadProperty] = addtionalPayload[additionalPayloadProperty];
	}

	return Object.keys(newPayload).map(key => `${key}=${newPayload[key]}`).join("&");
}

// Folked from https://github.com/WordPress/gutenberg/blob/d623dc1195a4499134f51fc713215174a4e669a6/packages/block-library/src/query/edit/inspector-controls/taxonomy-controls.js#L15
// Helper function to get the term id based on user input in terms `FormTokenField`.
const getTermIdByTermValue = ( terms, termValue, name_field ) => {
	// First we check for exact match by `term.id` or case sensitive `term.name` match.
	const termId =
		termValue?.id || terms.find( ( term ) => term[name_field] === termValue )?.id;
	if ( termId ) {
		return termId;
	}

	/**
	 * Here we make an extra check for entered terms in a non case sensitive way,
	 * to match user expectations, due to `FormTokenField` behaviour that shows
	 * suggestions which are case insensitive.
	 *
	 * Although WP tries to discourage users to add terms with the same name (case insensitive),
	 * it's still possible if you manually change the name, as long as the terms have different slugs.
	 * In this edge case we always apply the first match from the terms list.
	 */
	const termValueLower = termValue.toLocaleLowerCase();
	return terms.find(
		( term ) => term[name_field].toLocaleLowerCase() === termValueLower
	)?.id;
};

//Folked from https://github.com/WordPress/gutenberg/blob/d623dc1195a4499134f51fc713215174a4e669a6/packages/block-library/src/query/edit/inspector-controls/taxonomy-controls.js#L84
export const TaxonomyItem = ( { taxonomy_label, terms, value, onChange, name_field } ) => {

	if ( ! terms?.length ) {
		return null;
	}

	const onTermsChange = ( newTermValues ) => {
		const termIds = new Set();
        const termValues = new Set();
		for ( const termValue of newTermValues ) {
			const termId = getTermIdByTermValue( terms, termValue, name_field );

			if ( termId ) {
				termIds.add( termId );
                // The FormTokenField on change event is doing some strange thing. All the values inside the array other than the last one are returned as object.
                termValues.add( termValue.value ? termValue.value : termValue );
			}
		}
        
		onChange( Array.from( termIds ) );
	};

    // Selects only the existing term ids in proper format to be
	// used in `FormTokenField`. This prevents the component from
	// crashing in the editor, when non existing term ids were provided.
	const inputValue = value
    .map( ( termId ) => terms.find( ( t ) => t.id === termId ) )
    .filter( Boolean )
    .map( ( term ) => ( { id: term.id, value: term[name_field] } ) );

	return (
		<div className="block-library-query-inspector__taxonomy-control">
			<FormTokenField
				label={ taxonomy_label }
				value={ inputValue }
				suggestions={ terms.map( ( t ) => t[name_field] ) }
				onChange={ onTermsChange }
			/>
		</div>
	);
}