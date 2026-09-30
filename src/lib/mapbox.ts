import Mapbox from '@rnmapbox/maps';

const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

/**
 * Map style for every map surface. Until the ROLT style is published in Mapbox Studio,
 * Mapbox Outdoors is the closest match to the terrain-focused maps in the design.
 */
export const mapStyleUrl = process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL || Mapbox.StyleURL.Outdoors;

let initialized = false;

/** Sets the Mapbox access token once; called lazily by map components. */
export function initMapbox() {
  if (initialized) {
    return;
  }
  initialized = true;

  if (!accessToken || accessToken === 'pk.') {
    if (__DEV__) {
      console.warn('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is not set in .env; native maps will not load.');
    }
    return;
  }

  Mapbox.setAccessToken(accessToken);
}
