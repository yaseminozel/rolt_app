import type { LngLat } from '@/features/routes/types';

/**
 * Maneuver kinds the guidance understands (a subset of Mapbox Directions `maneuver.type`;
 * anything else is read as `continue`). Instruction text is built in the app from these
 * values (`ride:maneuver.*`), never taken from the provider, so every source reads the same.
 */
export type ManeuverType =
  | 'depart'
  | 'turn'
  | 'continue'
  | 'fork'
  | 'merge'
  | 'endOfRoad'
  | 'roundabout'
  | 'arrive';

/** Direction of a maneuver (Mapbox `maneuver.modifier`). */
export type ManeuverModifier =
  | 'uturn'
  | 'sharpRight'
  | 'right'
  | 'slightRight'
  | 'straight'
  | 'slightLeft'
  | 'left'
  | 'sharpLeft';

/** One guidance step: what to do at `startDistanceM` along the plan, then ride `distanceM`. */
export type NavigationStep = {
  type: ManeuverType;
  modifier?: ManeuverModifier;
  /** Roundabout exit number, when known. */
  exit?: number;
  location: LngLat;
  /** Road taken after the maneuver ("746. Sk"); absent for unnamed roads. */
  streetName?: string;
  /** Distance from the start of the plan to this maneuver. */
  startDistanceM: number;
  distanceM: number;
  durationS: number;
};

/** A road route through the waypoints with its turn-by-turn steps. */
export type NavigationPlan = {
  geometry: LngLat[];
  /** Running distance along `geometry` at each vertex (same length as `geometry`). */
  cumulativeM: number[];
  distanceM: number;
  durationS: number;
  steps: NavigationStep[];
};

/** A routing waypoint: `waypoint` ends a leg (start, stops, finish), `via` only shapes the line. */
export type PlanPoint = { coordinates: LngLat; kind: 'waypoint' | 'via' };

/** Turn-by-turn routing; Mapbox Directions with a token, the mock otherwise. */
export interface NavigationDirectionsService {
  plan(points: PlanPoint[]): Promise<NavigationPlan>;
}

/** One position report, from GPS or the simulator. */
export type LocationFix = {
  coordinates: LngLat;
  /** Horizontal accuracy in metres (smaller is better). */
  accuracyM: number;
  /** Metres per second; `null` when unknown. */
  speedMps: number | null;
  /** Degrees clockwise from north; `null` when unknown. */
  headingDeg: number | null;
  timestamp: number;
};

/** Where fixes come from during navigation. */
export interface LocationSource {
  /** Starts delivering fixes; resolves to a stop function. */
  start(onFix: (fix: LocationFix) => void): Promise<() => void>;
  /** The clock fixes are stamped with (the simulator runs faster than real time). */
  now(): number;
}

/** A stop the rider added (06.02–06.03), in riding order. */
export type RideStop = {
  id: string;
  name: string;
  /** Second line, e.g. "Rota üzerinde · 4,2. km". */
  subtitle?: string;
  coordinates: LngLat;
  /** Extra riding time the detour adds, in minutes (for "+1 dk sapma"). */
  detourMinutes: number;
};
