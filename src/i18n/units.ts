import { deviceStore } from '@/lib/deviceStore';

/** "Ölçü birimleri" (10.11): Metrik km · m · km/sa, Imperial mi · ft · mph. */
export type UnitSystem = 'metric' | 'imperial';

const UNITS_KEY = 'rolt.settings.units';
const KM_TO_MILES = 0.621371;
const METRES_TO_FEET = 3.28084;

function readStored(): UnitSystem {
  try {
    return deviceStore.getSync(UNITS_KEY) === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

let current: UnitSystem = readStored();

export const getUnitSystem = () => current;

/** Stores the choice; callers re-render the app (see `applyUnitSystem` in settings). */
export async function storeUnitSystem(system: UnitSystem) {
  current = system;
  await deviceStore.set(UNITS_KEY, system);
}

/** Kilometres in the display unit (km or mi). */
export const toDisplayDistance = (km: number) => (current === 'imperial' ? km * KM_TO_MILES : km);
/** km/h in the display unit (km/h or mph). */
export const toDisplaySpeed = (kmh: number) => (current === 'imperial' ? kmh * KM_TO_MILES : kmh);
/** Metres in the display unit (m or ft). */
export const toDisplayElevation = (metres: number) =>
  current === 'imperial' ? metres * METRES_TO_FEET : metres;
