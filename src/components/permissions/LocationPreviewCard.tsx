import { Image, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

/** Original map image from the design (`images/image-import-9.png`, 840 × 474), shown with `cover`. */
const mapImage = require('../../../assets/images/permission-location-map.jpg');

const CARD_HEIGHT = 220;
/** Inner white outline of the map ("Harita" stroke 1.5). */
const MAP_OUTLINE = 1.5;
const RADIUS_SIZE = 180;
const RADIUS_STROKE = 1.5;
const HALO_SIZE = 44;
const DOT_SIZE = 20;
const DOT_STROKE = 3;

/**
 * Map preview of 00.13 İzin / Konum (TJtI6 "Görsel"): static map image with the user's
 * position — a brand-blue dot in a halo inside an approximate-accuracy radius, centred.
 * Purely decorative. The design's route count pill, route line and locate button are
 * hidden layers and are not drawn.
 */
export function LocationPreviewCard() {
  return (
    <View style={styles.card} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={mapImage} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.outline} />
      <View style={styles.center}>
        <View style={styles.radius}>
          <View style={styles.halo}>
            <View style={styles.dot} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: radius.media,
    overflow: 'hidden',
    backgroundColor: colors.brandSubtle,
  },
  outline: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.media,
    borderWidth: MAP_OUTLINE,
    borderColor: colors.surface,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radius: {
    width: RADIUS_SIZE,
    height: RADIUS_SIZE,
    borderRadius: RADIUS_SIZE / 2,
    borderWidth: RADIUS_STROKE,
    borderColor: colors.locationRadiusStroke,
    backgroundColor: colors.locationRadiusFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: colors.locationHalo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: DOT_STROKE,
    borderColor: colors.surface,
    backgroundColor: colors.brand,
  },
});
