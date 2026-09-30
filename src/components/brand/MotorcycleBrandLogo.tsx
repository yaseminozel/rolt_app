import type { ComponentType } from 'react';
import Svg from 'react-native-svg';

import { BajajMark } from './marks/bajaj';
import { BmwMark } from './marks/bmw';
import { DucatiMark } from './marks/ducati';
import { HarleyDavidsonMark } from './marks/harleyDavidson';
import { HondaMark } from './marks/honda';
import { KawasakiMark } from './marks/kawasaki';
import { KtmMark } from './marks/ktm';
import { SuzukiMark } from './marks/suzuki';
import { TriumphMark } from './marks/triumph';
import { YamahaMark } from './marks/yamaha';

export type MotorcycleBrand =
  | 'honda'
  | 'yamaha'
  | 'bajaj'
  | 'ktm'
  | 'suzuki'
  | 'kawasaki'
  | 'bmw'
  | 'ducati'
  | 'triumph'
  | 'harleyDavidson';

/** Display names as written in the design (`Marka / <Name>` frames). */
export const motorcycleBrandNames: Record<MotorcycleBrand, string> = {
  honda: 'Honda',
  yamaha: 'Yamaha',
  bajaj: 'Bajaj',
  ktm: 'KTM',
  suzuki: 'Suzuki',
  kawasaki: 'Kawasaki',
  bmw: 'BMW',
  ducati: 'Ducati',
  triumph: 'Triumph',
  harleyDavidson: 'Harley-Davidson',
};

const marks: Record<MotorcycleBrand, ComponentType> = {
  honda: HondaMark,
  yamaha: YamahaMark,
  bajaj: BajajMark,
  ktm: KtmMark,
  suzuki: SuzukiMark,
  kawasaki: KawasakiMark,
  bmw: BmwMark,
  ducati: DucatiMark,
  triumph: TriumphMark,
  harleyDavidson: HarleyDavidsonMark,
};

type MotorcycleBrandLogoProps = {
  brand: MotorcycleBrand;
  /** Rendered width and height; the 28 × 28 artwork scales proportionally. */
  size?: number;
};

/**
 * 28 × 28 motorcycle brand marks. Pencil nodes: Honda `e7KsV`, Yamaha `avNYb`,
 * Bajaj `w2Atk`, KTM `tkGyc`, Suzuki `U4Ywf`, Kawasaki `SRC0L`, BMW `qNemJ`,
 * Ducati `camyX`, Triumph `SVXIR`, Harley-Davidson `UQNXV`.
 */
export function MotorcycleBrandLogo({ brand, size = 28 }: MotorcycleBrandLogoProps) {
  const Mark = marks[brand];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      accessible
      accessibilityRole="image"
      accessibilityLabel={motorcycleBrandNames[brand]}>
      <Mark />
    </Svg>
  );
}
