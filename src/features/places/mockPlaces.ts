import { isInBounds } from '@/features/routes/geo';
import type { SearchBoxOpenHours } from '@/features/search/mapboxSearchBox';
import { matchesSearch } from '@/lib/searchText';

import { openingStateFromPeriods } from './openingHours';
import type { PlacesRepository, ServicePlace } from './types';

type MockPlace = Omit<ServicePlace, 'opening'> & { hours?: SearchBoxOpenHours };

/** Search Box's "open 24 hours": one period that never closes. */
const OPEN_24H: SearchBoxOpenHours = { periods: [{ open: { day: 0, time: '0000' } }] };

/** The same hours on each of `days` (0 = Sunday … 6 = Saturday). */
const dailyHours = (days: number[], open: string, close: string) =>
  days.map((day) => ({ open: { day, time: open }, close: { day, time: close } }));

/**
 * MOCK fuel stations and repair shops: real places from Mapbox Search Box (`gas_station`,
 * `auto_repair`; snapshot 2026-10-08) along the mock routes, from Antalya and Kemer to Kumluca,
 * Adrasan and Kaş. Ids, names, addresses, coordinates and hours are Mapbox's; Mapbox has no
 * ratings, so there are none here either. Places without hours in Mapbox have none.
 */
const MOCK_PLACES: MockPlace[] = [
  {
    id: 'dXJuOm1ieHBvaTo4MjJmMzdkNC1jY2Y5LTRjNDItODhmNi0xMjRkZDU4ZTUyZGY',
    category: 'fuel',
    name: 'Gürsu Opet',
    address: 'Atatürk Blv. NO:179/A',
    coordinates: [30.63173358, 36.86350355],
    hours: OPEN_24H,
  },
  {
    id: 'dXJuOm1ieHBvaTo4NDQwZDI5OS0wMzMxLTQxMDgtOTk1Mi0xY2JlMGIyOTY0OGM',
    category: 'fuel',
    name: 'BP',
    address: 'Sakıp Sabancı Blv. No:122',
    coordinates: [30.66593567, 36.88599523],
    hours: OPEN_24H,
  },
  {
    id: 'dXJuOm1ieHBvaTphMDBjZTdkZi01MDUyLTQ3ZGQtOWQ4My05MDgxZjlkYWMwODk',
    category: 'fuel',
    name: 'Petrol Ofisi',
    address: 'Mevlana Cd. No:72',
    coordinates: [30.71547629, 36.89454624],
    hours: OPEN_24H,
  },
  {
    id: 'dXJuOm1ieHBvaTphYTE0YzAwMy0xMjg3LTRlMWUtOWE3Yy04ZTEzMmRjMDNkYjY',
    category: 'fuel',
    name: 'Shell',
    address: 'Karabucak Kümeevleri No:1',
    coordinates: [30.54220945, 36.58610158],
    hours: OPEN_24H,
  },
  {
    id: 'dXJuOm1ieHBvaTowYzU1NTlmYS0wMDI2LTQ3MGEtYTU1Ny1lOTU5NzhmMzVkZjA',
    category: 'fuel',
    name: 'Shell Kutsi Özer Petrol',
    address: 'Adnan Menderes Blv. No:120',
    coordinates: [30.29365106, 36.3651502],
    hours: OPEN_24H,
  },
  {
    id: 'dXJuOm1ieHBvaTplMmEyNjMyOS0yMmJmLTQ5NzktYTg2MS04ODAzNjJhMDQ2YTM',
    category: 'fuel',
    name: 'TotalEnergies İstasyonu',
    address: 'Antalya Caddesi No:47',
    coordinates: [30.434552, 36.3357043],
    hours: OPEN_24H,
  },
  {
    id: 'dXJuOm1ieHBvaToxMjA0ZGZlMS0xMTAzLTRkYmQtYWEyNy1mZTJjNThiZGViNzI',
    category: 'fuel',
    name: 'Petrol Ofisi',
    address: 'Atatürk Blv. No:36',
    coordinates: [29.63851101, 36.20187999],
    hours: OPEN_24H,
  },
  {
    id: 'dXJuOm1ieHBvaTpmMjRhMDBlMi1hYjdkLTQ2ZGItYWI4NS02YjU0Mjg5MDBkOTM',
    category: 'repair',
    name: '1 Moto Dadaş',
    address: 'Öğretmenevleri Mah 18. Cad 932 sok Köşk 1 Sit D Blk No:3',
    coordinates: [30.63915318, 36.87292788],
    hours: { periods: dailyHours([1, 2, 3, 4, 5, 6], '0900', '2200') },
  },
  {
    id: 'dXJuOm1ieHBvaTpjMDE1NGEwNy0yNzI1LTRkZjctYWE4OC0xZjg2ZjQ1OGZkMTk',
    category: 'repair',
    name: 'Exper Motor Antalya Motosiklet Ekspertiz ve Servis',
    address: 'gürpınar apartmanı',
    coordinates: [30.71382655, 36.89747397],
    hours: {
      periods: [...dailyHours([1, 2, 3, 4, 5], '0930', '1800'), ...dailyHours([6], '0900', '1700')],
    },
  },
  {
    id: 'dXJuOm1ieHBvaTo3ZGU1OTJkMS0wNDUwLTQ3NDMtYTUxMy1mYWQzZWQxM2IzZDU',
    category: 'repair',
    name: 'Honda Orun Motor',
    address: 'Dörtyol Blv. No:68',
    coordinates: [30.5472212, 36.59967928],
  },
  {
    id: 'dXJuOm1ieHBvaToyNDJlOGI0MS02NWZjLTQzMTQtYTVjZS1hYjNhZGU2MmY4NWY',
    category: 'repair',
    name: 'Ekspres Motor Servisi',
    address: 'Karasin Sk.',
    coordinates: [30.29028298, 36.36486753],
    hours: {
      periods: [...dailyHours([1, 2, 3, 4, 5], '0830', '2000'), ...dailyHours([6], '0930', '1900')],
    },
  },
  {
    id: 'dXJuOm1ieHBvaTplODU2MGIzMy0wZGQ3LTRlYjctOWM2YS02MmU2ZWJiY2VkZjA',
    category: 'repair',
    name: 'Karabulut Motor Adrasan',
    address: 'deniz yolu caddesi',
    coordinates: [30.43525577, 36.33064262],
    hours: { periods: dailyHours([1, 2, 3, 4, 5], '0830', '1900') },
  },
];

const NETWORK_DELAY_MS = 300;

export const mockPlaces: PlacesRepository = {
  async listInArea({ bounds, category, query = '' }) {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
    const now = new Date();
    return MOCK_PLACES.filter(
      (place) =>
        place.category === category &&
        isInBounds(place.coordinates, bounds) &&
        matchesSearch(place.name, query),
    ).map(({ hours, ...place }) => ({ ...place, opening: openingStateFromPeriods(hours, now) }));
  },
};
