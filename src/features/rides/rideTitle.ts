import { distanceKm } from '@/features/routes/geo';
import { TURKISH_CITIES } from '@/features/location/turkishCities';
import type { LngLat } from '@/features/routes/types';
import { i18n } from '@/i18n';

import type { RideRecord } from './types';

/** Farther than this from every province centre, the title has no city. */
const MAX_CITY_DISTANCE_KM = 120;

/** Province whose centre is nearest to `point` (offline approximation, good enough for a title). */
export function nearestCityName(point: LngLat): string | undefined {
  let best: { name: string; km: number } | undefined;
  for (const city of TURKISH_CITIES) {
    const km = distanceKm(point, [city.longitude, city.latitude]);
    if (!best || km < best.km) {
      best = { name: city.name, km };
    }
  }
  return best && best.km <= MAX_CITY_DISTANCE_KM ? best.name : undefined;
}

/** Automatic title when the rider leaves "Sürüş adı" empty (rule C: "Antalya · Pazartesi sürüşü"). */
export function autoRideTitle(ride: Pick<RideRecord, 'city' | 'startedAt'>) {
  const weekday = new Intl.DateTimeFormat(i18n.language === 'tr' ? 'tr-TR' : 'en-GB', {
    weekday: 'long',
  }).format(new Date(ride.startedAt));
  return ride.city
    ? i18n.t('rides:autoTitle.withCity', { city: ride.city, weekday })
    : i18n.t('rides:autoTitle.withoutCity', { weekday });
}

/** The title a ride is shown with. */
export const rideTitle = (ride: Pick<RideRecord, 'title' | 'city' | 'startedAt'>) =>
  ride.title.trim() || autoRideTitle(ride);
