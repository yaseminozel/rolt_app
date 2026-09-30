/**
 * Base map looks the map surfaces can switch between. `default` is the ROLT style
 * (`EXPO_PUBLIC_MAPBOX_STYLE_URL`, Mapbox Outdoors until it is published); `satellite` is
 * Mapbox Satellite Streets, used by the "Haritada Keşfet" layers button.
 * Kept free of `@rnmapbox/maps` so screens can import it in Expo Go.
 */
export type MapStyle = 'default' | 'satellite';
