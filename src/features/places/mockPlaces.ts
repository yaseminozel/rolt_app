import { isInBounds } from '@/features/routes/geo';
import { matchesSearch } from '@/lib/searchText';

import type { PlacesRepository, ServicePlace } from './types';

/**
 * MOCK fuel stations and repair shops around Antalya. The first entries are the design's rows
 * (07.02 `I3V8M`, 07.03 `sXCGN`); the design repeats one station as filler, so the rest of the
 * list is made up of real-looking places in the same area.
 */
const MOCK_PLACES: ServicePlace[] = [
  {
    id: 'fuel-1',
    category: 'fuel',
    name: 'Shell Antalya Konyaaltı',
    address: 'Atatürk Bulvarı, Konyaaltı',
    coordinates: [30.6405, 36.8738],
    rating: 4.7,
    opening: 'open24h',
  },
  {
    id: 'fuel-2',
    category: 'fuel',
    name: 'Opet Liman',
    address: 'Liman Mah. Boğaçayı Cd., Konyaaltı',
    coordinates: [30.6031, 36.8618],
    rating: 4.4,
    opening: 'closed',
  },
  {
    id: 'fuel-3',
    category: 'fuel',
    name: 'Petrol Ofisi Uncalı',
    address: 'Uncalı Cd. No:312, Konyaaltı',
    coordinates: [30.6512, 36.8902],
    rating: 4.3,
    opening: 'open24h',
  },
  {
    id: 'fuel-4',
    category: 'fuel',
    name: 'BP Lara',
    address: 'Lara Cd., Muratpaşa',
    coordinates: [30.7712, 36.8584],
    rating: 4.5,
    opening: 'open',
  },
  {
    id: 'fuel-5',
    category: 'fuel',
    name: 'Shell Kemer',
    address: 'D400, Kemer',
    coordinates: [30.5583, 36.6021],
    rating: 4.6,
    opening: 'open24h',
  },
  {
    id: 'fuel-6',
    category: 'fuel',
    name: 'Total Kaş',
    address: 'Hükümet Cd., Kaş',
    coordinates: [29.6418, 36.2021],
    rating: 4.2,
    opening: 'closed',
  },
  {
    id: 'repair-1',
    category: 'repair',
    name: 'MotoServis Konyaaltı',
    address: 'Akdeniz Blv. No:41, Konyaaltı',
    coordinates: [30.6288, 36.8711],
    rating: 4.8,
    opening: 'open24h',
  },
  {
    id: 'repair-2',
    category: 'repair',
    name: 'Kemer Moto Bakım',
    address: 'Yeni Mah. 12. Sk., Kemer',
    coordinates: [30.5602, 36.5978],
    rating: 4.6,
    opening: 'open24h',
  },
  {
    id: 'repair-3',
    category: 'repair',
    name: 'Yol Yardım Lastik',
    address: 'D400 üzeri, Göynük',
    coordinates: [30.5521, 36.6702],
    rating: 4.2,
    opening: 'open24h',
  },
  {
    id: 'repair-4',
    category: 'repair',
    name: 'Akdeniz Motor Garaj',
    address: 'Uncalı Cd. No:18, Konyaaltı',
    coordinates: [30.6553, 36.8861],
    rating: 4.5,
    opening: 'closed',
  },
  {
    id: 'repair-5',
    category: 'repair',
    name: 'Hızlı Zincir & Fren',
    address: 'Kepez Sanayi Sitesi, Kepez',
    coordinates: [30.7001, 36.9333],
    rating: 4.4,
    opening: 'open',
  },
];

const NETWORK_DELAY_MS = 300;

export const mockPlaces: PlacesRepository = {
  async listInArea({ bounds, category, query = '' }) {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
    return MOCK_PLACES.filter(
      (place) =>
        place.category === category &&
        isInBounds(place.coordinates, bounds) &&
        matchesSearch(place.name, query),
    );
  },
};
