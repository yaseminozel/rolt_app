import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { placeNameAt } from '@/features/location/placeName';
import type { Route } from '@/features/routes/types';

import { ridesRepository, type RideDetailsInput } from './ridesRepository';
import type { RideRecord } from './types';

/** Saved rides are per account (`RideRecord.ownerId`); keys carry the viewer so switching refetches. */
export const rideKeys = {
  all: ['rides'] as const,
  saved: () => [...rideKeys.all, 'saved'] as const,
  savedBy: (viewerId: string | null) => [...rideKeys.saved(), viewerId] as const,
  detail: (id: string) => [...rideKeys.all, 'detail', id] as const,
  detailFor: (id: string, viewerId: string | null) => [...rideKeys.detail(id), viewerId] as const,
  defaultVisibility: () => [...rideKeys.all, 'defaultVisibility'] as const,
};

/** The signed-in account, which owns the rides it saves. */
const useViewerId = () => useAuth().session?.userId ?? null;

export function useSavedRides() {
  const viewerId = useViewerId();
  return useQuery({
    queryKey: rideKeys.savedBy(viewerId),
    queryFn: () => ridesRepository.listSaved(viewerId),
  });
}

export function useRideRecord(id: string | undefined) {
  const viewerId = useViewerId();
  return useQuery({
    queryKey: rideKeys.detailFor(id ?? '', viewerId),
    queryFn: () => ridesRepository.get(id ?? '', viewerId),
    enabled: Boolean(id),
  });
}

export function useDefaultRideVisibility() {
  return useQuery({
    queryKey: rideKeys.defaultVisibility(),
    queryFn: ridesRepository.defaultVisibility,
  });
}

function useRideCacheUpdate() {
  const queryClient = useQueryClient();
  const viewerId = useViewerId();
  return (ride: RideRecord | null, id: string) => {
    queryClient.setQueryData(rideKeys.detailFor(id, viewerId), ride);
    queryClient.invalidateQueries({ queryKey: rideKeys.saved() });
    queryClient.invalidateQueries({ queryKey: rideKeys.defaultVisibility() });
  };
}

/** "Sürüşü kaydet" (08.05) and "Değişiklikleri kaydet" (09.07). */
export function useSaveRide() {
  const updateCache = useRideCacheUpdate();
  const viewerId = useViewerId();
  return useMutation({
    mutationFn: ({ id, details }: { id: string; details: RideDetailsInput }) =>
      ridesRepository.save(id, details, viewerId),
    onSuccess: (ride) => updateCache(ride, ride.id),
  });
}

/** A single change to a saved ride, e.g. visibility from the ride options (09.06). */
export function useUpdateRide() {
  const updateCache = useRideCacheUpdate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<RideRecord> }) =>
      ridesRepository.update(id, patch),
    onSuccess: (ride) => updateCache(ride, ride.id),
  });
}

/** "Sürüşü sil" (08.09, 09.06): irreversible, confirmed before. */
export function useDeleteRide() {
  const updateCache = useRideCacheUpdate();
  const viewerId = useViewerId();
  return useMutation({
    mutationFn: (id: string) => ridesRepository.remove(id, viewerId).then(() => id),
    onSuccess: (id) => updateCache(null, id),
  });
}

/**
 * Start and finish names of a ride (09.06 "Sürüş güzergahı"): a route ride uses the route's
 * own names, a free ride the area around its first and last track point (another rider's ride:
 * of its shared, end-cut trace).
 */
export function useRideEndpoints(
  ride: Pick<RideRecord, 'id' | 'routeId' | 'track'>,
  route: Route | null | undefined,
  routeSettled: boolean,
) {
  const first = ride.track[0]?.[0];
  const lastSegment = ride.track[ride.track.length - 1];
  const last = lastSegment?.[lastSegment.length - 1];
  return useQuery({
    queryKey: [...rideKeys.detail(ride.id), 'endpoints', route?.id ?? null],
    queryFn: async () => {
      if (route) {
        return { start: route.startName, end: route.endName };
      }
      const [start, end] = await Promise.all([
        first ? placeNameAt(first) : undefined,
        last ? placeNameAt(last) : undefined,
      ]);
      return { start, end };
    },
    // A route ride waits for its route; an unknown (deleted) route falls back to geocoding.
    enabled: Boolean(first) && (!ride.routeId || routeSettled),
    staleTime: Infinity,
  });
}
