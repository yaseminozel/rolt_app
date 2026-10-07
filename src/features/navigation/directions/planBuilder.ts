import { cumulativeDistances } from '../geometry';
import type { NavigationPlan, NavigationStep } from '../types';

/**
 * Fills in the derived fields of a plan (running distances, step start distances). Step lengths
 * are scaled to the geometry: Mapbox measures with a larger earth radius (~0.11 % longer than
 * `distanceM`), which would otherwise put maneuvers late (~50 m after 45 km).
 */
export function buildPlan(
  geometry: NavigationPlan['geometry'],
  steps: Omit<NavigationStep, 'startDistanceM'>[],
  durationS: number,
): NavigationPlan {
  const cumulativeM = cumulativeDistances(geometry);
  const distanceM = cumulativeM[cumulativeM.length - 1] ?? 0;
  const stepTotalM = steps.reduce((sum, step) => sum + step.distanceM, 0);
  const scale = stepTotalM > 0 ? distanceM / stepTotalM : 1;
  let start = 0;
  const withStarts = steps.map((step) => {
    const result = { ...step, startDistanceM: Math.min(start * scale, distanceM) };
    start += step.distanceM;
    return result;
  });
  return { geometry, cumulativeM, distanceM, durationS, steps: withStarts };
}
