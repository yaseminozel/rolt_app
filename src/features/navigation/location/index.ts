import { isNativeMapAvailable } from '@/components/map/BaseMap';
import type { LngLat } from '@/features/routes/types';

import type { LocationProfile, LocationSource } from '../types';
import { createDeviceLocationSource } from './deviceLocationSource';
import { createSimulatedLocationSource, type SimulationScenario } from './simulatedLocationSource';

/**
 * Real GPS needs a development build; Expo Go and the web preview (no native map either)
 * simulate the ride instead. `EXPO_PUBLIC_SIMULATE_NAVIGATION=1` forces the simulator on a
 * device, e.g. to test guidance at a desk.
 */
export const isSimulatedNavigation =
  !isNativeMapAvailable || process.env.EXPO_PUBLIC_SIMULATE_NAVIGATION === '1';

const SIMULATION_SCENARIOS: readonly SimulationScenario[] = ['normal', 'offRoute', 'weakGps', 'lostGps', 'break'];
/** Dev knobs for the simulator: `EXPO_PUBLIC_NAV_SIM_SCENARIO` and `EXPO_PUBLIC_NAV_SIM_SPEED` (time scale). */
const envScenario = SIMULATION_SCENARIOS.find((item) => item === process.env.EXPO_PUBLIC_NAV_SIM_SCENARIO);
const envTimeScale = Number(process.env.EXPO_PUBLIC_NAV_SIM_SPEED) || undefined;

export function createNavigationLocationSource({
  line,
  stops,
  scenario,
  notification,
  profile = 'navigation',
}: {
  line: LngLat[];
  stops: LngLat[];
  scenario?: SimulationScenario;
  notification: { title: string; body: string };
  profile?: LocationProfile;
}): LocationSource {
  return isSimulatedNavigation
    ? createSimulatedLocationSource({ line, stops, scenario: scenario ?? envScenario, timeScale: envTimeScale })
    : createDeviceLocationSource(notification, profile);
}

export type { SimulationScenario };
