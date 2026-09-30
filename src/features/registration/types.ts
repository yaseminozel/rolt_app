import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';

/** "Sevdiğin yollar" chips on 00.11 (Fv4ol). Separate from `RideType`, which classifies a single ride. */
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

export const roadPreferenceLabels: Record<RoadPreference, string> = {
  curvyRoads: 'Virajlı yollar',
  coast: 'Sahil',
  mountainRoads: 'Dağ yolları',
  city: 'Şehir içi',
  longTour: 'Uzun tur',
  offRoad: 'Off-road',
  weekendGetaway: 'Hafta sonu kaçamağı',
  nightRiding: 'Gece sürüşü',
};

/** "Tempon" segmented control on 00.11. */
export type RidingTempo = 'relaxed' | 'balanced' | 'sporty';

export const ridingTempoLabels: Record<RidingTempo, string> = {
  relaxed: 'Sakin',
  balanced: 'Dengeli',
  sporty: 'Sportif',
};

/** "Sürüş deneyimin" segmented control on 00.11. */
export type ExperienceRange = 'zeroToTwo' | 'threeToFive' | 'fivePlus';

export const experienceRangeLabels: Record<ExperienceRange, string> = {
  zeroToTwo: '0–2 yıl',
  threeToFive: '3–5 yıl',
  fivePlus: '5+ yıl',
};

/** Data collected across registration steps 00.8–00.11; every field is optional because steps can be skipped. */
export type RegistrationDraft = {
  photoUri?: string;
  fullName?: string;
  username?: string;
  city?: string;
  brand?: MotorcycleBrand;
  modelId?: string;
  modelYear?: number;
  roadPreferences: RoadPreference[];
  tempo?: RidingTempo;
  experience?: ExperienceRange;
};
