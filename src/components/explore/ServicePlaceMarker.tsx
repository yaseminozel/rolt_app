import { Wrench } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, type SvgProps } from 'react-native-svg';

import type { ServicePlaceCategory } from '@/features/places/types';
import { colors, shadows } from '@/theme';

import { FuelPumpIcon } from './FuelPumpIcon';

const HEAD_SIZE = 34;
const HEAD_BORDER = 2;
const ICON_SIZE = 18;
/** White tail under the head ("Tip" 12 × 8, starting 3 pt above the head's bottom). */
const TAIL = { width: 12, height: 8, top: 31 };
export const SERVICE_PLACE_MARKER_SIZE = { width: HEAD_SIZE, height: TAIL.top + TAIL.height };
/** The tail tip, for `MarkerView` anchors. */
export const SERVICE_PLACE_MARKER_ANCHOR = { x: 0.5, y: 1 } as const;

const TONES: Record<ServicePlaceCategory, { background: string; icon: ComponentType<SvgProps> }> = {
  fuel: { background: colors.placeFuel, icon: FuelPumpIcon },
  repair: { background: colors.placeRepair, icon: Wrench },
};

type ServicePlaceMarkerProps = {
  category: ServicePlaceCategory;
  accessibilityLabel?: string;
  onPress?: () => void;
};

/**
 * Fuel station / repair shop pin (07.02 `I3V8M` "POI / Fuel", 07.03 `sXCGN`): a round head with
 * a white ring and glyph over a small white tail. Also leads each row of the sheet list.
 */
export function ServicePlaceMarker({
  category,
  accessibilityLabel,
  onPress,
}: ServicePlaceMarkerProps) {
  const { background, icon: Icon } = TONES[category];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'auto' : 'no-hide-descendants'}
      hitSlop={5}
      style={styles.box}>
      <Svg width={TAIL.width} height={TAIL.height} style={styles.tail}>
        <Path d="M0 0H12L6 8Z" fill={colors.surface} />
      </Svg>
      <View style={[styles.head, { backgroundColor: background }]}>
        <Icon width={ICON_SIZE} height={ICON_SIZE} color={colors.textInverse} strokeWidth={1.5} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SERVICE_PLACE_MARKER_SIZE.width,
    height: SERVICE_PLACE_MARKER_SIZE.height,
  },
  tail: {
    position: 'absolute',
    top: TAIL.top,
    left: (HEAD_SIZE - TAIL.width) / 2,
  },
  head: {
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    borderRadius: HEAD_SIZE / 2,
    borderWidth: HEAD_BORDER,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.mapCluster,
  },
});
