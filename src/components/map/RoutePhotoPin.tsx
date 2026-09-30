import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, fontFamily, radius, shadows } from '@/theme';

const PIN_WIDTH = 72;
const PIN_HEIGHT = 89;
const PHOTO_INSET = 4;
const PHOTO_WIDTH = 64;
const PHOTO_HEIGHT = 72;
const GRADIENT_HEIGHT = 34;
/** Rounded body plus the 8.5 pt tail (01.7 "Pin gövdesi"). */
const PIN_BODY_PATH =
  'M14 0h44a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14h-14l-8 8.5-8-8.5h-14a14 14 0 0 1-14-14v-52a14 14 0 0 1 14-14z';

/** Share of the pin height where the tail tip sits, for `MarkerView` anchors. */
export const ROUTE_PHOTO_PIN_ANCHOR = { x: 0.5, y: 1 } as const;

type RoutePhotoPinProps = {
  image: ImageSourcePropType;
  /** 1-based position of the route in the sheet list. */
  number: number;
  accessibilityLabel: string;
  onPress?: () => void;
  /** Another route is selected: drawn at 30 % (01.7 "Rota seçili" `lBW4t`). */
  dimmed?: boolean;
};

/**
 * Numbered photo marker for a route on "Haritada Keşfet" (01.7 `VaJNL`, `H3OjE`, `LKyvA`):
 * white pin with the route cover, a bottom legibility gradient and the list number.
 */
export function RoutePhotoPin({ image, number, accessibilityLabel, onPress, dimmed = false }: RoutePhotoPinProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={[styles.pin, dimmed && styles.dimmed]}>
      <View style={styles.bodyShadow} />
      <Svg width={PIN_WIDTH} height={PIN_HEIGHT} style={StyleSheet.absoluteFill}>
        <Path d={PIN_BODY_PATH} fill={colors.surface} />
      </Svg>
      <View style={styles.photo}>
        <Image source={image} contentFit="cover" style={StyleSheet.absoluteFill} />
        <Svg width={PHOTO_WIDTH} height={GRADIENT_HEIGHT} style={styles.gradient}>
          <Defs>
            <LinearGradient id="pinFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.mediaGradientClear} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.mediaGradientMid} />
            </LinearGradient>
          </Defs>
          <Rect width={PHOTO_WIDTH} height={GRADIENT_HEIGHT} fill="url(#pinFade)" />
        </Svg>
        <Text style={styles.number}>{number}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: PIN_WIDTH,
    height: PIN_HEIGHT,
  },
  dimmed: {
    opacity: 0.3,
  },
  // The shadow follows the rounded body; the small tail stays unshadowed.
  bodyShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PIN_WIDTH,
    height: PIN_HEIGHT - 9,
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
  gradient: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  number: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textInverse,
  },
});
