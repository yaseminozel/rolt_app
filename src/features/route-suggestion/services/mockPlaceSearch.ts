import { TURKISH_CITIES } from '@/features/location/turkishCities';
import { distanceKm } from '@/features/routes/geo';
import type { LngLat } from '@/features/routes/types';
import { matchesSearch } from '@/lib/searchText';

import type { Place } from '../types';
import type { PlaceSearchService, PlaceSuggestion } from './types';

/**
 * MOCK used when no Mapbox token is set. Places from the Rota Öner designs (04.1) plus every
 * province centre, so any city can be typed.
 */
export const MOCK_PLACES: (Place & { category?: string })[] = [
  { id: 'kadikoy', name: 'Kadıköy', subtitle: 'İstanbul', category: 'İlçe', coordinates: [29.0275, 40.9905] },
  { id: 'kadikoy-pier', name: 'Kadıköy İskelesi', subtitle: 'Rıhtım Cd., Kadıköy', coordinates: [29.0222, 40.9929] },
  { id: 'moda-coast', name: 'Kadıköy Moda Sahili', subtitle: 'Moda, Kadıköy', coordinates: [29.0256, 40.9812] },
  { id: 'bull-statue', name: 'Kadıköy Boğa Heykeli', subtitle: 'Altıyol, Kadıköy', coordinates: [29.0306, 40.9902] },
  { id: 'agva', name: 'Ağva Sahili', subtitle: 'Şile, İstanbul', coordinates: [29.8547, 41.1372] },
  { id: 'sile-lighthouse', name: 'Şile Feneri', subtitle: 'Şile, İstanbul', coordinates: [29.6128, 41.1778] },
  { id: 'buyukada', name: 'Büyükada', subtitle: 'Adalar, İstanbul', category: 'Mahalle', coordinates: [29.1204, 40.8722] },
  { id: 'bostanci-pier', name: 'Bostancı İskelesi', subtitle: 'Bostancı, Kadıköy', coordinates: [29.0955, 40.9548] },
  { id: 'adrasan', name: 'Adrasan', subtitle: 'Kumluca, Antalya', category: 'Köy', coordinates: [30.47, 36.305] },
  { id: 'adrasan-bay', name: 'Adrasan Koyu', subtitle: 'Kumluca, Antalya', coordinates: [30.482, 36.3] },
  ...TURKISH_CITIES.map((city) => ({
    id: `city-${city.plateCode}`,
    name: city.name,
    subtitle: 'Türkiye',
    category: 'İl',
    coordinates: [city.longitude, city.latitude] as LngLat,
  })),
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockPlaceSearch: PlaceSearchService = {
  async suggest(query, { proximity }) {
    await wait(250);
    return MOCK_PLACES.filter((place) => matchesSearch(place.name, query))
      .slice(0, 8)
      .map<PlaceSuggestion>((place) => ({
        id: place.id,
        name: place.name,
        subtitle: place.subtitle,
        category: place.category,
        distanceKm: proximity ? distanceKm(proximity, place.coordinates) : undefined,
      }));
  },

  async retrieve(suggestion) {
    await wait(150);
    const place = MOCK_PLACES.find((item) => item.id === suggestion.id);
    if (!place) {
      throw new Error(`Unknown mock place ${suggestion.id}`);
    }
    return { id: place.id, name: place.name, subtitle: place.subtitle, coordinates: place.coordinates };
  },

  async reverse(coordinates) {
    await wait(250);
    const nearest = [...MOCK_PLACES].sort(
      (a, b) => distanceKm(coordinates, a.coordinates) - distanceKm(coordinates, b.coordinates),
    )[0];
    return {
      id: `point-${coordinates[0].toFixed(5)},${coordinates[1].toFixed(5)}`,
      name: nearest ? `${nearest.name} yakını` : `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`,
      subtitle: nearest?.subtitle,
      coordinates,
    };
  },
};
