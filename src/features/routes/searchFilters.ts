import type {
  DistanceRange,
  DurationRange,
  Route,
  RouteDifficulty,
  RouteSearchFilters,
  RouteTag,
} from './types';

export const EMPTY_ROUTE_SEARCH_FILTERS: RouteSearchFilters = {
  distance: null,
  duration: null,
  tags: [],
  difficulty: null,
  loopOnly: false,
};

/** Option order of the filter sheet (PXcQ0). */
export const DISTANCE_RANGES: readonly DistanceRange[] = [
  'under50',
  'from50to100',
  'from100to200',
  'over200',
];
export const DURATION_RANGES: readonly DurationRange[] = ['under1h', 'from1to3h', 'over3h'];
export const FILTER_ROUTE_TAGS: readonly RouteTag[] = [
  'coast',
  'curvy',
  'scenic',
  'city',
  'nature',
  'offRoad',
  'longTour',
];
export const FILTER_DIFFICULTIES: readonly RouteDifficulty[] = ['easy', 'moderate', 'hard'];

/** Lower bound inclusive, upper bound exclusive. */
const DISTANCE_KM: Record<DistanceRange, [number, number]> = {
  under50: [0, 50],
  from50to100: [50, 100],
  from100to200: [100, 200],
  over200: [200, Infinity],
};

const DURATION_MINUTES: Record<DurationRange, [number, number]> = {
  under1h: [0, 60],
  from1to3h: [60, 180],
  over3h: [180, Infinity],
};

const inRange = (value: number, [min, max]: [number, number]) => value >= min && value < max;

export function matchesSearchFilters(route: Route, filters: RouteSearchFilters) {
  return (
    (filters.distance === null || inRange(route.distanceKm, DISTANCE_KM[filters.distance])) &&
    (filters.duration === null ||
      inRange(route.durationMinutes, DURATION_MINUTES[filters.duration])) &&
    (filters.tags.length === 0 || filters.tags.includes(route.tag)) &&
    (filters.difficulty === null || route.difficulty === filters.difficulty) &&
    (!filters.loopOnly || route.isLoop)
  );
}

/** Number of filter groups with a constraint; drives the badge on "Filtrele". */
export function countActiveSearchFilters(filters: RouteSearchFilters) {
  return [
    filters.distance !== null,
    filters.duration !== null,
    filters.tags.length > 0,
    filters.difficulty !== null,
    filters.loopOnly,
  ].filter(Boolean).length;
}
