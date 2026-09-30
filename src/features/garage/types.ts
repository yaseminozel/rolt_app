import type { MotorcycleBrand } from '@/components/brand/MotorcycleBrandLogo';

export type MotorcycleModel = {
  id: string;
  brand: MotorcycleBrand;
  name: string;
  /** Engine displacement in cc, shown as "689 cc". */
  displacementCc: number;
  /** Class label as shown in the design ("Naked", "Adventure", "Sport touring"). */
  category: string;
};
