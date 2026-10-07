import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { Bounds } from '@/features/routes/types';

import { placesRepository } from './index';
import type { ServicePlaceCategory } from './types';

export const placeKeys = {
  all: ['places'] as const,
  area: (bounds: Bounds, category: ServicePlaceCategory) =>
    [...placeKeys.all, 'area', category, bounds] as const,
};

/** Places of `category` in the visible area; off while the map shows routes (`category` null). */
export function usePlacesInArea(bounds: Bounds, category: ServicePlaceCategory | null) {
  return useQuery({
    queryKey: placeKeys.area(bounds, category ?? 'fuel'),
    queryFn: () => placesRepository.listInArea({ bounds, category: category ?? 'fuel' }),
    enabled: category !== null,
    // Keep the pins while the map moves to a new area.
    placeholderData: keepPreviousData,
  });
}
