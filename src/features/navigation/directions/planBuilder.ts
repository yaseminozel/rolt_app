import { cumulativeDistances } from '../geometry';
import type { NavigationPlan, NavigationStep } from '../types';

/** Fills in the derived fields of a plan (running distances, step start distances). */
export function buildPlan(
  geometry: NavigationPlan['geometry'],
  steps: Omit<NavigationStep, 'startDistanceM'>[],
  durationS: number,
): NavigationPlan {
  const cumulativeM = cumulativeDistances(geometry);
  const distanceM = cumulativeM[cumulativeM.length - 1] ?? 0;
  let start = 0;
  const withStarts = steps.map((step) => {
    const result = { ...step, startDistanceM: Math.min(start, distanceM) };
    start += step.distanceM;
    return result;
  });
  return { geometry, cumulativeM, distanceM, durationS, steps: withStarts };
}
