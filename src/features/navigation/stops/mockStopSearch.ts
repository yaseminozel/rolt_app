import type { LngLat } from '@/features/routes/types';
import { matchesSearch } from '@/lib/searchText';

import { bearingDeg, cumulativeDistances, pointAlong } from '../geometry';
import type { StopCandidate, StopCategory, StopSearchService } from './stopSearch';

/**
 * MOCK places along any route, laid out like the design's list (06.02 `wozjI`): fuel at the
 * start and on the route, a café on it, a mechanic just off it, a viewpoint and a café far off.
 * Names come from the design; positions follow the route so every route has suggestions.
 */
const MOCK_PLACES: { name: string; category: StopCategory; fraction: number; offsetM: number }[] = [
  { name: 'Opet Kepez', category: 'fuel', fraction: 0.02, offsetM: 60 },
  { name: 'Shell Geyikbayırı', category: 'fuel', fraction: 0.32, offsetM: 30 },
  { name: 'Kahve Durağı', category: 'cafe', fraction: 0.55, offsetM: 0 },
  { name: 'Moto Usta Ahmet', category: 'mechanic', fraction: 0.62, offsetM: 450 },
  { name: 'Tahtalı Seyir Terası', category: 'viewpoint', fraction: 0.78, offsetM: 40 },
  { name: 'Beycik Moto Kafe', category: 'cafe', fraction: 0.86, offsetM: 3_600 },
];

const METRES_PER_DEGREE = 111_320;
const NETWORK_DELAY_MS = 300;
const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

function offsetRight([lng, lat]: LngLat, bearing: number, metres: number): LngLat {
  const angle = ((bearing + 90) * Math.PI) / 180;
  return [
    lng + (metres * Math.sin(angle)) / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180)),
    lat + (metres * Math.cos(angle)) / METRES_PER_DEGREE,
  ];
}

function placesFor(line: LngLat[]): StopCandidate[] {
  const cumulative = cumulativeDistances(line);
  const total = cumulative[cumulative.length - 1] ?? 0;
  return MOCK_PLACES.map((place, index) => {
    const { point } = pointAlong(line, cumulative, total * place.fraction);
    const ahead = pointAlong(line, cumulative, total * place.fraction + 50).point;
    return {
      id: `mock-stop-${index}`,
      name: place.name,
      category: place.category,
      coordinates: offsetRight(point, bearingDeg(point, ahead), place.offsetM),
    };
  });
}

export const mockStopSearch: StopSearchService = {
  async alongRoute({ line, category }) {
    await wait();
    return placesFor(line).filter((place) => category === null || place.category === category);
  },
  async search({ query, line }) {
    await wait();
    return placesFor(line).filter((place) => matchesSearch(place.name, query));
  },
  async reverse(coordinates) {
    await wait();
    return {
      id: `point-${coordinates[0].toFixed(5)},${coordinates[1].toFixed(5)}`,
      name: `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`,
      coordinates,
    };
  },
};
