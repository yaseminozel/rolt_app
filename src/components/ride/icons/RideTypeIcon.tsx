import { Car, City, DashboardSpeed, PathArrow, SeaAndSun, Tree } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';

import type { RideType } from '@/features/rides/rideTypes';

import { LongRideIcon } from './LongRideIcon';

/** Iconoir glyph per ride type; `longRide` uses the custom `LongRideIcon`. */
const iconoirIcons: Record<Exclude<RideType, 'longRide'>, ComponentType<SvgProps>> = {
  city: City,
  nature: Tree,
  curves: PathArrow,
  sport: DashboardSpeed,
  offRoad: Car,
  coast: SeaAndSun,
};

type RideTypeIconProps = {
  type: RideType;
  size?: number;
  color: string;
  /** Rendered stroke width in points (converted to the 24-unit viewBox). */
  strokeWidth: number;
};

/** Ride type pictogram as drawn in `N0mch` (24 px) and `dlaPh` (20 px). */
export function RideTypeIcon({ type, size = 24, color, strokeWidth }: RideTypeIconProps) {
  const viewBoxStroke = (strokeWidth * 24) / size;

  if (type === 'longRide') {
    return <LongRideIcon size={size} color={color} strokeWidth={viewBoxStroke} />;
  }

  const Icon = iconoirIcons[type];
  return <Icon width={size} height={size} color={color} strokeWidth={viewBoxStroke} />;
}
