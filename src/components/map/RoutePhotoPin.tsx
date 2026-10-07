import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius, shadows } from '@/theme';

export const ROUTE_PHOTO_PIN_SIZE = { width: 72, height: 89 } as const;
const PHOTO_INSET = 4;
const PHOTO_WIDTH = 64;
const PHOTO_HEIGHT = 72;
/** Rounded body plus the 8.5 pt tail ("Pin gövdesi"). */
const PIN_BODY_PATH =
  'M14 0h44a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14h-14l-8 8.5-8-8.5h-14a14 14 0 0 1-14-14v-52a14 14 0 0 1 14-14z';

/** Share of the pin size where the tail tip sits, for `MarkerView` anchors. */
export const ROUTE_PHOTO_PIN_ANCHOR = { x: 0.5, y: 1 } as const;

type RoutePhotoPinProps = {
  image: ImageSourcePropType;
  accessibilityLabel: string;
  onPress?: () => void;
};

/**
 * Photo marker of a single route on "Haritada Keşfet" (07.01 `LXKWN` "POI"): white pin with
 * the route cover, its tail on the route.
 */
export function RoutePhotoPin({ image, accessibilityLabel, onPress }: RoutePhotoPinProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={styles.pin}>
      <View style={styles.bodyShadow} />
      <Svg
        width={ROUTE_PHOTO_PIN_SIZE.width}
        height={ROUTE_PHOTO_PIN_SIZE.height}
        style={StyleSheet.absoluteFill}>
        <Path d={PIN_BODY_PATH} fill={colors.surface} />
      </Svg>
      <View style={styles.photo}>
        <Image source={image} contentFit="cover" style={StyleSheet.absoluteFill} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: ROUTE_PHOTO_PIN_SIZE.width,
    height: ROUTE_PHOTO_PIN_SIZE.height,
  },
  // The shadow follows the rounded body; the small tail stays unshadowed.
  bodyShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ROUTE_PHOTO_PIN_SIZE.width,
    height: ROUTE_PHOTO_PIN_SIZE.height - 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapPin,
  },
  photo: {
    position: 'absolute',
    top: PHOTO_INSET,
    left: PHOTO_INSET,
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: radius.chip,
    overflow: 'hidden',
  },
});
