import type { LngLat } from '@/features/routes/types';

import { bearingDeg, distanceM, turnAngle } from '../geometry';
import type { ManeuverModifier, NavigationDirectionsService, NavigationStep } from '../types';
import { buildPlan } from './planBuilder';

/** Mock riding speed: 40 km/h. */
const SPEED_MPS = 11;
/** Bends sharper than this become a "turn" step. */
const TURN_THRESHOLD_DEG = 28;
const NETWORK_DELAY_MS = 400;

function modifierFor(angle: number): ManeuverModifier {
  const size = Math.abs(angle);
  const side = angle > 0 ? 'Right' : 'Left';
  if (size > 150) {
    return 'uturn';
  }
  if (size > 110) {
    return side === 'Right' ? 'sharpRight' : 'sharpLeft';
  }
  if (size > 45) {
    return side === 'Right' ? 'right' : 'left';
  }
  return side === 'Right' ? 'slightRight' : 'slightLeft';
}

/**
 * Straight lines between the points (the route fixtures are already road-shaped) with a turn
 * step wherever the line bends, an "arrive" at every stop and at the finish. No road names.
 * Used without a Mapbox token, in Expo Go and on the web preview.
 */
export const mockDirections: NavigationDirectionsService = {
  async plan(points) {
    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));
    const geometry: LngLat[] = points.map((point) => point.coordinates);
    const steps: Omit<NavigationStep, 'startDistanceM'>[] = [];
    let pending: Omit<NavigationStep, 'startDistanceM' | 'distanceM' | 'durationS'> = {
      type: 'depart',
      location: geometry[0],
    };
    let segmentDistance = 0;

    for (let index = 1; index < geometry.length; index += 1) {
      segmentDistance += distanceM(geometry[index - 1], geometry[index]);
      const isLast = index === geometry.length - 1;
      const isStop = points[index].kind === 'waypoint' && !isLast;
      const next = geometry[index + 1];
      const angle = next
        ? turnAngle(bearingDeg(geometry[index - 1], geometry[index]), bearingDeg(geometry[index], next))
        : 0;
      if (isLast || isStop || Math.abs(angle) >= TURN_THRESHOLD_DEG) {
        steps.push({ ...pending, distanceM: segmentDistance, durationS: segmentDistance / SPEED_MPS });
        segmentDistance = 0;
        if (isLast) {
          steps.push({ type: 'arrive', location: geometry[index], distanceM: 0, durationS: 0 });
        } else if (isStop) {
          steps.push({ type: 'arrive', location: geometry[index], distanceM: 0, durationS: 0 });
          pending = { type: 'depart', location: geometry[index] };
        } else {
          pending = { type: 'turn', modifier: modifierFor(angle), location: geometry[index] };
        }
      }
    }
    const total = steps.reduce((sum, step) => sum + step.durationS, 0);
    return buildPlan(geometry, steps, total);
  },
};
