import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { Bounds } from '@/features/routes/types';

import { placesRepository } from './index';
import type { ServicePlaceCategory } from './types';

export const placeKeys = {
  all: ['places'] as const,
  area: (bounds: Bounds, category: ServicePlaceCategory, query: string) =>
    [...placeKeys.all, 'area', category, bounds, query] as const,
};

/** Places of `category` in the visible area; off while the map shows routes (`category` null). */
export function usePlacesInArea(bounds: Bounds, category: ServicePlaceCategory | null, query = '') {
  return useQuery({
    queryKey: placeKeys.area(bounds, category ?? 'fuel', query),
    queryFn: () => placesRepository.listInArea({ bounds, category: category ?? 'fuel', query }),
    enabled: category !== null,
    // Keep the pins while the map moves to a new area.
    placeholderData: keepPreviousData,
  });
}
