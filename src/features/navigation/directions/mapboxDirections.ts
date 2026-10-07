import { mapboxToken } from '@/features/route-suggestion/services/mapboxConfig';
import type { LngLat } from '@/features/routes/types';

import type {
  ManeuverModifier,
  ManeuverType,
  NavigationDirectionsService,
  NavigationStep,
} from '../types';
import { buildPlan } from './planBuilder';

type DirectionsStep = {
  distance: number;
  duration: number;
  name?: string;
  maneuver: { type: string; modifier?: string; location: LngLat; exit?: number };
};

type DirectionsResponse = {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: LngLat[] };
    legs: { steps: DirectionsStep[] }[];
  }[];
};

const TYPES: Record<string, ManeuverType> = {
  depart: 'depart',
  arrive: 'arrive',
  turn: 'turn',
  'roundabout turn': 'turn',
  continue: 'continue',
  'new name': 'continue',
  notification: 'continue',
  'exit roundabout': 'continue',
  'exit rotary': 'continue',
  merge: 'merge',
  'on ramp': 'fork',
  'off ramp': 'fork',
  fork: 'fork',
  'end of road': 'endOfRoad',
  roundabout: 'roundabout',
  rotary: 'roundabout',
};

const MODIFIERS: Record<string, ManeuverModifier> = {
  uturn: 'uturn',
  'sharp right': 'sharpRight',
  right: 'right',
  'slight right': 'slightRight',
  straight: 'straight',
  'slight left': 'slightLeft',
  left: 'left',
  'sharp left': 'sharpLeft',
};

/**
 * Mapbox Directions, `driving` profile (no motorcycle profile exists; docs/mapbox-routing.md),
 * with turn-by-turn steps. `waypoints` marks the points that end a leg (start, stops, finish),
 * so via points only shape the line and produce no "arrive" step. Up to 25 coordinates.
 * Only maneuver kind, direction, position and road name are kept; the app writes the text.
 */
export const mapboxDirections: NavigationDirectionsService = {
  async plan(points) {
    const path = points.map(({ coordinates: [lng, lat] }) => `${lng},${lat}`).join(';');
    const waypointIndexes = points
      .map((point, index) => (point.kind === 'waypoint' || index === 0 || index === points.length - 1 ? index : -1))
      .filter((index) => index >= 0);
    const query = new URLSearchParams({
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      waypoints: waypointIndexes.join(';'),
      access_token: mapboxToken,
    });
    const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${path}?${query}`);
    const data = (await response.json()) as DirectionsResponse;
    const route = data.routes?.[0];
    if (!response.ok || data.code !== 'Ok' || !route) {
      throw new Error(`Mapbox Directions ${data.code ?? response.status}`);
    }
    const steps: Omit<NavigationStep, 'startDistanceM'>[] = [];
    route.legs.forEach((leg, legIndex) =>
      leg.steps.forEach((step) => {
        if (step.maneuver.type === 'depart' && legIndex > 0) {
          // A leg's arrive step is the next leg's start; keep it so stops are announced, and give
          // it the depart step's length so the maneuvers after a stop stay in place.
          const arrive = steps[steps.length - 1];
          steps[steps.length - 1] = {
            ...arrive,
            streetName: step.name || arrive.streetName,
            distanceM: arrive.distanceM + step.distance,
            durationS: arrive.durationS + step.duration,
          };
          return;
        }
        steps.push({
          type: TYPES[step.maneuver.type] ?? 'continue',
          modifier: step.maneuver.modifier ? MODIFIERS[step.maneuver.modifier] : undefined,
          exit: step.maneuver.exit,
          location: step.maneuver.location,
          streetName: step.name || undefined,
          distanceM: step.distance,
          durationS: step.duration,
        });
      }),
    );
    return buildPlan(route.geometry.coordinates, steps, route.duration);
  },
};
