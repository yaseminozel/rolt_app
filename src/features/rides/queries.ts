import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ridesRepository, type RideDetailsInput } from './ridesRepository';
import type { RideRecord } from './types';

export const rideKeys = {
  all: ['rides'] as const,
  saved: () => [...rideKeys.all, 'saved'] as const,
  detail: (id: string) => [...rideKeys.all, 'detail', id] as const,
  defaultVisibility: () => [...rideKeys.all, 'defaultVisibility'] as const,
};

export function useSavedRides() {
  return useQuery({ queryKey: rideKeys.saved(), queryFn: ridesRepository.listSaved });
}

export function useRideRecord(id: string | undefined) {
  return useQuery({
    queryKey: rideKeys.detail(id ?? ''),
    queryFn: () => ridesRepository.get(id ?? ''),
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
  return (ride: RideRecord | null, id: string) => {
    queryClient.setQueryData(rideKeys.detail(id), ride);
    queryClient.invalidateQueries({ queryKey: rideKeys.saved() });
    queryClient.invalidateQueries({ queryKey: rideKeys.defaultVisibility() });
  };
}

/** "Sürüşü kaydet" (08.05) and "Değişiklikleri kaydet" (09.07). */
export function useSaveRide() {
  const updateCache = useRideCacheUpdate();
  return useMutation({
    mutationFn: ({ id, details }: { id: string; details: RideDetailsInput }) =>
      ridesRepository.save(id, details),
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
  return useMutation({
    mutationFn: (id: string) => ridesRepository.remove(id).then(() => id),
    onSuccess: (id) => updateCache(null, id),
  });
}
