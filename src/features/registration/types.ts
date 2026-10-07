import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';
import type { Place } from '@/features/route-suggestion/types';

/**
 * Kinds of road a rider likes; a rider match reason (`riders/types`). Registration no longer
 * asks for them (the riding-style step left the design), the type stays for rider data.
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

/**
 * Data collected across registration steps 04.01–04.03; every field is optional because each
 * step can be skipped.
 */
export type RegistrationDraft = {
  photoUri?: string;
  fullName?: string;
  username?: string;
  /** 04.02 "Konumun": the device location or a searched place. */
  homePlace?: Place;
  brand?: MotorcycleBrand;
  modelId?: string;
  modelYear?: number;
};
