import { Image } from 'expo-image';
import { Check, Sparks } from 'iconoir-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontFamily, radius, spacing, typography } from '@/theme';

export type SuggestedPhoto = {
  id: string;
  /** Anything expo-image can load, including `ph://` (iOS) and `content://` (Android) library ids. */
  uri: string;
};

export type SuggestedPhotosStripProps = {
  /** "Bu rotada çektiğin fotoğraflar". */
  title: string;
  /** "6 bulundu". */
  countLabel: string;
  /** Line under the strip, e.g. "Konum ve saat bilgisine göre otomatik eşleştirildi." */
  note?: string;
  photos: readonly SuggestedPhoto[];
  selectedIds: readonly string[];
  onToggle: (photoId: string) => void;
  /** Unselected photos ignore taps (e.g. the photo limit is reached). */
  selectionLocked?: boolean;
  /** 1-based index → accessibility label. */
  photoAccessibilityLabel: (index: number) => string;
  style?: StyleProp<ViewStyle>;
};

const THUMB_WIDTH = 62;
const THUMB_HEIGHT = 58;
const SPARK_SIZE = 15;
const CHECK_SIZE = 18;
const CHECK_GLYPH_SIZE = 11;
const CHECK_INSET = 4;
const CHECK_BORDER = 1.5;
/** Card padding and strip gap as drawn ("Sürüş fotoğrafları" padding 14, gap 10; "Şerit" gap 6). */
const CARD_PADDING = 14;
const CARD_GAP = 10;
const THUMB_GAP = 6;

/**
 * Photos from the device that match the current route ("Sürüş fotoğrafları" in `iJrop`): a
 * brand-tinted card with a title and count, a horizontally scrolling row of selectable
 * thumbnails with check badges, and a note. Selection state belongs to the caller.
 */
export function SuggestedPhotosStrip({
  title,
  countLabel,
  note,
  photos,
  selectedIds,
  onToggle,
  selectionLocked = false,
  photoAccessibilityLabel,
  style,
}: SuggestedPhotosStripProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Sparks width={SPARK_SIZE} height={SPARK_SIZE} color={colors.brand} strokeWidth={1.5} />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.count}>{countLabel}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}>
        {photos.map((photo, index) => {
          const selected = selectedIds.includes(photo.id);
          const locked = !selected && selectionLocked;
          return (
            <Pressable
              key={photo.id}
              onPress={() => onToggle(photo.id)}
              disabled={locked}
              accessibilityRole="checkbox"
              accessibilityLabel={photoAccessibilityLabel(index + 1)}
              accessibilityState={{ checked: selected, disabled: locked }}
              style={({ pressed }) => [styles.thumb, pressed && styles.thumbPressed]}>
              <Image
                source={{ uri: photo.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                recyclingKey={photo.id}
                transition={150}
                accessibilityIgnoresInvertColors
              />
              <View style={[styles.check, selected ? styles.checkSelected : styles.checkEmpty]}>
                {selected ? (
                  <Check
                    width={CHECK_GLYPH_SIZE}
                    height={CHECK_GLYPH_SIZE}
                    color={colors.textInverse}
                    strokeWidth={2.2}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: CARD_GAP,
    padding: CARD_PADDING,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.calloutSemibold,
    flex: 1,
    color: colors.textPrimary,
  },
  count: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    color: colors.brand,
  },
  strip: {
    gap: THUMB_GAP,
  },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
  },
  thumbPressed: {
    opacity: 0.85,
  },
  check: {
    position: 'absolute',
    top: CHECK_INSET,
    left: CHECK_INSET,
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CHECK_SIZE / 2,
    borderWidth: CHECK_BORDER,
    borderColor: colors.surface,
  },
  checkSelected: {
    backgroundColor: colors.brand,
  },
  // Not drawn in the design: an empty ring tells unselected thumbnails are selectable.
  checkEmpty: {
    backgroundColor: colors.scrim,
  },
  // Design draws 11 pt; 12 keeps it on the type scale.
  note: {
    ...typography.captionRelaxed,
    color: colors.textSecondary,
  },
});
