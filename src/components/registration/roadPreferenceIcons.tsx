import { Calendar, City, HalfMoon, PathArrow, SeaAndSun } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';

import { LongRideIcon } from '@/components/ride/icons/LongRideIcon';
import type { RoadPreference } from '@/features/registration/types';

import { MountainIcon } from './icons/MountainIcon';
import { TentIcon } from './icons/TentIcon';

/** Adapts the ride-type "Uzun Yol" pictogram to the Iconoir prop shape used by chips. */
function LongTourIcon({ width, color, strokeWidth }: SvgProps) {
  return (
    <LongRideIcon
      size={typeof width === 'number' ? width : undefined}
      color={typeof color === 'string' ? color : 'currentColor'}
      strokeWidth={typeof strokeWidth === 'number' ? strokeWidth : undefined}
    />
  );
}

/** "Sevdiğin yollar" chip icons (Fv4ol), per the CLAUDE.md decision table. */
export const roadPreferenceIcons: Record<RoadPreference, ComponentType<SvgProps>> = {
  curvyRoads: PathArrow,
  coast: SeaAndSun,
  mountainRoads: MountainIcon,
  city: City,
  longTour: LongTourIcon,
  offRoad: TentIcon,
  weekendGetaway: Calendar,
  nightRiding: HalfMoon,
};
