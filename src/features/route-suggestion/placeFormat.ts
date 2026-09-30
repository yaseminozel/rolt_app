import { i18n } from '@/i18n';
import { formatDistance, formatDuration, turkishAccusativeSuffix, turkishLocativeSuffix } from '@/i18n/format';
import type { LngLat } from '@/features/routes/types';

import type { Place, RoutePreview } from './types';

/**
 * One-line place value for the stop list: name plus the first part of its subtitle, e.g.
 * "Kadıköy, İstanbul", "Şile Feneri, Şile", "Büyükada, Adalar" (04.1 `D8XrfG`, `aIGJ2`).
 */
export function placeShortLabel(place: Place) {
  const area = place.subtitle?.split(',')[0]?.trim();
  if (!area || area === place.name) {
    return place.name;
  }
  return `${place.name}, ${area}`;
}

/**
 * Coordinates as "40.9869° K, 29.0270° D" / "40.9869° N, 29.0270° E". Always a dot and four
 * decimals in both languages (as the design writes them): a Turkish decimal comma would collide
 * with the comma between latitude and longitude.
 */
export function formatCoordinates([longitude, latitude]: LngLat) {
  return i18n.t('routeSuggestion:pickOnMap.coordinates', {
    latitude: Math.abs(latitude).toFixed(4),
    latitudeHemisphere: i18n.t(latitude >= 0 ? 'routeSuggestion:pickOnMap.north' : 'routeSuggestion:pickOnMap.south'),
    longitude: Math.abs(longitude).toFixed(4),
    longitudeHemisphere: i18n.t(longitude >= 0 ? 'routeSuggestion:pickOnMap.east' : 'routeSuggestion:pickOnMap.west'),
  });
}

/** "73 km · ~1 sa 45 dk" on the preview card (an estimate), "73 km · 1 sa 45 dk" on the edit panel. */
export function formatRouteSummary(preview: Pick<RoutePreview, 'distanceKm' | 'durationMinutes'>, estimate: boolean) {
  return i18n.t(estimate ? 'routeSuggestion:preview.summaryEstimate' : 'routeSuggestion:preview.summary', {
    distance: formatDistance(preview.distanceKm),
    duration: formatDuration(preview.durationMinutes),
  });
}

/**
 * Turkish case suffixes for place names inside sentences ("Büyükada’da", "Bostancı İskelesi’ni").
 * English copy doesn't use them, so they are empty there.
 */
export function placeSuffixes(name: string) {
  if (i18n.language !== 'tr') {
    return { locative: '', accusative: '' };
  }
  return { locative: turkishLocativeSuffix(name), accusative: turkishAccusativeSuffix(name) };
}
