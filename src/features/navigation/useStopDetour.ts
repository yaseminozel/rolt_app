import { useEffect, useMemo, useState } from 'react';

import type { LngLat } from '@/features/routes/types';

import { navigationDirections } from './directions';
import { useRideSession } from './RideSessionProvider';
import { buildRidePoints, LARGE_DETOUR_M, rideLine, sortStopsAlongRoute } from './ridePlan';
import type { NavigationPlan, RideStop } from './types';

export type StopDetour =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      detourM: number;
      extraMinutes: number;
      plan: NavigationPlan;
      /** Over 3 km: the preview warns (note `wYzjk`). */
      large: boolean;
    };

/**
 * Real detour of a candidate stop (06.03 "Sapma" / "Ek süre" / "Yeni toplam"): the ride is
 * planned again with the stop inserted in route order and compared with the current plan.
 */
export function useStopDetour(candidate: { coordinates: LngLat } | null) {
  const { route, reversed, stops, plan, hasApproach } = useRideSession();
  const [result, setResult] = useState<{ key: string; value: StopDetour } | null>(null);
  const line = useMemo(() => rideLine(route, reversed), [route, reversed]);
  const coordinateKey = candidate
    ? `${candidate.coordinates[0].toFixed(5)},${candidate.coordinates[1].toFixed(5)}`
    : '';
  // Results belong to one candidate and plan; anything else reads as loading.
  const key = `${coordinateKey}|${plan?.distanceM ?? 0}|${stops.length}`;

  useEffect(() => {
    if (!candidate || !plan) {
      return;
    }
    let cancelled = false;
    const probe: RideStop = {
      id: 'probe',
      name: '',
      coordinates: candidate.coordinates,
      detourMinutes: 0,
    };
    const origin = hasApproach ? plan.geometry[0] : null;
    navigationDirections
      .plan(buildRidePoints({ line, stops: sortStopsAlongRoute([...stops, probe], line), origin }))
      .then((next) => {
        if (cancelled) {
          return;
        }
        const detourM = Math.max(0, next.distanceM - plan.distanceM);
        setResult({
          key,
          value: {
            status: 'ready',
            detourM,
            extraMinutes: Math.max(0, Math.round((next.durationS - plan.durationS) / 60)),
            plan: next,
            large: detourM > LARGE_DETOUR_M,
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ key, value: { status: 'error' } });
        }
      });
    return () => {
      cancelled = true;
    };
    // The candidate is tracked through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hasApproach, line, plan, stops]);

  return result?.key === key ? result.value : ({ status: 'loading' } as const);
}
