import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

/** The row always has five slots (01.6 `Fy8i8`: 5 × 65 pt + 4 × 8 pt = 361 pt). */
const SLOTS = 5;
const TILE_ASPECT_RATIO = 65 / 84;

/**
 * "Sürüş görselleri" thumbnails (01.6 `JTF5F`). Up to five photos; with more, the fifth
 * tile is dimmed and shows "+N" for the photos not shown. No gallery is designed, so the
 * tiles are not interactive.
 */
export function RoutePhotoStrip({ photos }: { photos: readonly ImageSourcePropType[] }) {
  const { t } = useTranslation('routeDetail');
  const visible = photos.slice(0, SLOTS);
  const hiddenCount = photos.length - SLOTS;

  return (
    <View style={styles.row}>
      {Array.from({ length: SLOTS }, (_, index) => {
        const photo = visible[index];
        if (!photo) {
          return <View key={index} style={styles.slot} />;
        }
        const isOverflow = index === SLOTS - 1 && hiddenCount > 0;
        return (
          <View
            key={index}
            style={[styles.slot, styles.tile]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={
              isOverflow
                ? `${t('a11y.photo', { index: index + 1, total: photos.length })}, ${t('a11y.morePhotos', { count: hiddenCount })}`
                : t('a11y.photo', { index: index + 1, total: photos.length })
            }>
            <Image source={photo} contentFit="cover" style={styles.image} />
            {isOverflow ? (
              <View style={styles.overflow}>
                <Text style={styles.overflowLabel}>{t('morePhotos', { count: hiddenCount })}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    // Room for the tile shadow.
    paddingBottom: spacing.xs,
  },
  slot: {
    flex: 1,
    aspectRatio: TILE_ASPECT_RATIO,
  },
  tile: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceMuted,
    boxShadow: shadows.raised,
  },
  image: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.sm - 1.5,
  },
  overflow: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm - 1.5,
    backgroundColor: colors.scrim,
  },
  overflowLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 17,
    color: colors.textInverse,
  },
});
