import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { WaypointKind } from '@/features/route-suggestion/types';
import { colors, radius } from '@/theme';

import { WaypointBadge } from './WaypointBadge';

const WIDTH = 44;
const HEIGHT = 66;
const HEAD = 36;
const STEM_WIDTH = 2;
const STEM_HEIGHT = 24;

/** Where the stem touches the ground, relative to the pin's top-left: place this on the map point. */
export const MAP_CENTER_PIN_TIP = { x: WIDTH / 2, y: HEAD + STEM_HEIGHT } as const;
export const MAP_CENTER_PIN_SIZE = { width: WIDTH, height: HEIGHT } as const;

type MapCenterPinProps = {
  kind: WaypointKind;
  /** Position the pin with `left`/`top` = point − `MAP_CENTER_PIN_TIP`. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Fixed pin over the middle of a draggable map (04.1 "Haritadan seç" `eUfBt` "Merkez pin"):
 * the waypoint badge as the head, a thin stem and a soft ground shadow. Decorative, touches pass
 * through to the map.
 */
export function MapCenterPin({ kind, style }: MapCenterPinProps) {
  return (
    <View style={[styles.pin, style]} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.ground} />
      <View style={styles.stem} />
      <WaypointBadge kind={kind} size="pin" style={styles.head} />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: WIDTH,
    height: HEIGHT,
  },
  ground: {
    position: 'absolute',
    left: 14,
    top: 58,
    width: 16,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
  },
  stem: {
    position: 'absolute',
    left: (WIDTH - STEM_WIDTH) / 2,
    top: HEAD,
    width: STEM_WIDTH,
    height: STEM_HEIGHT,
    backgroundColor: colors.textPrimary,
  },
  head: {
    position: 'absolute',
    left: (WIDTH - HEAD) / 2,
    top: 0,
  },
});
