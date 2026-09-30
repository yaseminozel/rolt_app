const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

/** True when a real public token is set in `.env` (not the "pk." placeholder). */
export const hasMapboxToken = token.startsWith('pk.') && token.length > 3;
export const mapboxToken = token;
export const mapboxSearchCountry = process.env.EXPO_PUBLIC_MAPBOX_SEARCH_COUNTRY || 'tr';
export const routingProvider = process.env.EXPO_PUBLIC_ROUTING_PROVIDER || 'mapbox';
