import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';

/**
 * "Sevdiğin yollar" chips on 00.11 (Fv4ol); labels: `registration:roadPreferences.*`.
 * Separate from `RideType`, which classifies a single ride.
 */
export type RoadPreference =
  | 'curvyRoads'
  | 'coast'
  | 'mountainRoads'
  | 'city'
  | 'longTour'
  | 'offRoad'
  | 'weekendGetaway'
  | 'nightRiding';

export const ROAD_PREFERENCES: readonly RoadPreference[] = [
  'curvyRoads',
  'coast',
  'mountainRoads',
  'city',
  'longTour',
  'offRoad',
  'weekendGetaway',
  'nightRiding',
];

/** "Tempon" segmented control on 00.11 (labels: `registration:tempo.*`). */
export type RidingTempo = 'relaxed' | 'balanced' | 'sporty';

export const RIDING_TEMPOS: readonly RidingTempo[] = ['relaxed', 'balanced', 'sporty'];

/** "Sürüş deneyimin" segmented control on 00.11 (labels: `registration:experience.*`). */
export type ExperienceRange = 'zeroToTwo' | 'threeToFive' | 'fivePlus';

export const EXPERIENCE_RANGES: readonly ExperienceRange[] = ['zeroToTwo', 'threeToFive', 'fivePlus'];

/** Data collected across registration steps 00.8–00.11; every field is optional because steps can be skipped. */
export type RegistrationDraft = {
  photoUri?: string;
  fullName?: string;
  username?: string;
  city?: string;
  brand?: MotorcycleBrand;
  /** Brand typed on 00.9 via "Listede yok mu?"; mutually exclusive with `brand`. */
  customBrandName?: string;
  modelId?: string;
  /** Model typed on 00.10 when the brand has no catalog match; mutually exclusive with `modelId`. */
  customModelName?: string;
  modelYear?: number;
  roadPreferences: RoadPreference[];
  tempo?: RidingTempo;
  experience?: ExperienceRange;
};
