import type { LngLat } from '@/features/routes/types';

import { bearingDeg, cumulativeDistances, distanceM, pointAlong } from '../geometry';
import type { LocationFix, LocationSource } from '../types';

/** Scripted situations so every guidance state can be seen without riding (`?scenario=`). */
export type SimulationScenario = 'normal' | 'offRoute' | 'weakGps' | 'lostGps' | 'break';

export type SimulationOptions = {
  line: LngLat[];
  /** Stops to pause at in the `break` scenario. */
  stops?: LngLat[];
  scenario?: SimulationScenario;
  /** Riding speed in m/s (default 40 km/h). */
  speedMps?: number;
  /** Simulated seconds per real second, so a 10 km route can be watched in a minute or two. */
  timeScale?: number;
};

const TICK_MS = 1_000;
/** Scenarios begin this far into the route. */
const SCENARIO_START = 0.1;
const OFF_ROUTE_SIDE_M = 90;
const METRES_PER_DEGREE = 111_320;

/** Moves a point `metres` to the right of `bearing`. */
function offsetRight([lng, lat]: LngLat, bearing: number, metres: number): LngLat {
  const angle = ((bearing + 90) * Math.PI) / 180;
  const dLat = (metres * Math.cos(angle)) / METRES_PER_DEGREE;
  const dLng = (metres * Math.sin(angle)) / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  return [lng + dLng, lat + dLat];
}

/**
 * Drives along the planned line and reports fixes like a GPS would. Used where real location
 * can't run (Expo Go, web preview) or when `EXPO_PUBLIC_SIMULATE_NAVIGATION=1`. Scenarios:
 * `offRoute` leaves the line at 10 % for ~25 s, `weakGps` degrades accuracy at 10 % for ~20 s,
 * `lostGps` stops reporting at 10 % for 35 s, `break` stands 25 s at every stop (simulated time).
 */
export function createSimulatedLocationSource({
  line,
  stops = [],
  scenario = 'normal',
  speedMps = 11,
  timeScale = 6,
}: SimulationOptions): LocationSource {
  const realStart = Date.now();
  const clock = () => realStart + (Date.now() - realStart) * timeScale;
  return {
    now: clock,
    async start(onFix) {
      const cumulative = cumulativeDistances(line);
      const total = cumulative[cumulative.length - 1] ?? 0;
      const stopAlong = stops.map((stop) => {
        let best = 0;
        let bestDistance = Infinity;
        line.forEach((point, index) => {
          const d = distanceM(point, stop);
          if (d < bestDistance) {
            bestDistance = d;
            best = cumulative[index];
          }
        });
        return best;
      });
      const pausedStops = new Set<number>();
      const scenarioStart = total * SCENARIO_START;
      let along = 0;
      let lastTickAt = clock();
      let pauseLeftS = 0;
      let scenarioLeftS = scenario === 'offRoute' ? 25 : scenario === 'weakGps' ? 20 : scenario === 'lostGps' ? 35 : 0;
      let scenarioRunning = false;

      const timer = setInterval(() => {
        const tickAt = clock();
        const stepS = (tickAt - lastTickAt) / 1000;
        lastTickAt = tickAt;

        if (pauseLeftS > 0) {
          pauseLeftS -= stepS;
        } else {
          along = Math.min(total, along + speedMps * stepS);
        }
        if (scenario === 'break') {
          stopAlong.forEach((stopAlongM, index) => {
            if (!pausedStops.has(index) && along >= stopAlongM) {
              pausedStops.add(index);
              along = stopAlongM;
              pauseLeftS = 25;
            }
          });
        }
        if (!scenarioRunning && scenarioLeftS > 0 && along >= scenarioStart) {
          scenarioRunning = true;
        }
        if (scenarioRunning) {
          scenarioLeftS -= stepS;
          if (scenarioLeftS <= 0) {
            scenarioRunning = false;
          }
        }

        const { point, bearing } = pointAlong(line, cumulative, along);
        if (scenarioRunning && scenario === 'lostGps') {
          return;
        }
        const coordinates =
          scenarioRunning && scenario === 'offRoute' ? offsetRight(point, bearing, OFF_ROUTE_SIDE_M) : point;
        const standing = pauseLeftS > 0;
        const fix: LocationFix = {
          coordinates,
          accuracyM: scenarioRunning && scenario === 'weakGps' ? 80 : 6,
          speedMps: standing ? 0 : speedMps,
          headingDeg: bearing,
          timestamp: tickAt,
        };
        onFix(fix);
      }, TICK_MS);

      return () => clearInterval(timer);
    },
  };
}

/** Bearing of the first segment, so the map can face the riding direction before the first fix. */
export const initialBearing = (line: LngLat[]) => (line.length > 1 ? bearingDeg(line[0], line[1]) : 0);
