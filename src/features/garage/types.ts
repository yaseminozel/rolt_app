import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';

export type MotorcycleCategory =
  | 'naked'
  | 'sport'
  | 'sportTouring'
  | 'adventure'
  | 'touring'
  | 'cruiser'
  | 'scrambler';

export type MotorcycleModel = {
  id: string;
  brand: MotorcycleBrand;
  name: string;
  /** Engine displacement in cc, shown as "689 cc". */
  displacementCc: number;
  /** Motorcycle class; label via `garage:categories.*`. */
  category: MotorcycleCategory;
};
