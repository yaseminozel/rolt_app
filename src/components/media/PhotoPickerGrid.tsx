import { Image } from 'expo-image';
import { MediaImagePlus, Refresh } from 'iconoir-react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { showActionSheet, type ActionSheetOption } from '@/lib/showActionSheet';
import { colors, radius, spacing, typography } from '@/theme';

/** Upload state of a picked photo; photos upload as soon as they are added. */
export type PhotoTileStatus = 'uploading' | 'uploaded' | 'failed';

export type PhotoTileItem = {
  id: string;
  uri: string;
  /** Omit for photos that are not uploaded separately (treated as `uploaded`). */
  status?: PhotoTileStatus;
};

/** Caller-provided copy; `index` is 1-based. */
export type PhotoPickerGridLabels = {
  /** "Ekle" under the add glyph. */
  add: string;
  addA11y: string;
  /** "Kapak" badge on the first photo. */
  cover: string;
  /** "Tekrar" on a failed tile. */
  retry: string;
  photoA11y: (index: number) => string;
  coverA11y: (index: number) => string;
  uploadingA11y: (index: number) => string;
  failedA11y: (index: number) => string;
  /** Photo menu: "Kapak yap", "Kaldır", "Vazgeç". */
  setCover: string;
  remove: string;
  cancel: string;
};

export type PhotoPickerGridProps = {
  photos: readonly PhotoTileItem[];
  labels: PhotoPickerGridLabels;
  /** Shows the "Ekle" tile first while fewer than `max` photos are picked. */
  onAdd?: () => void;
  max?: number;
  /** The first photo is the cover and carries the "Kapak" badge. Default true. */
  showCover?: boolean;
  /** Tapping a failed tile retries it. */
  onRetry?: (photoId: string) => void;
  /** Offered in the photo menu (tap an uploaded / uploading photo, long-press a failed one). */
  onRemove?: (photoId: string) => void;
  /** Offered in the photo menu for every photo but the current cover. */
  onSetCover?: (photoId: string) => void;
  /** `strip` (default): one horizontally scrolling row (`ldcdM` "Fotoğraf şeridi"); `grid`: wrapping rows. */
  layout?: 'strip' | 'grid';
  style?: StyleProp<ViewStyle>;
};

const TILE_SIZE = 64;
const ADD_ICON_SIZE = 20;
const RETRY_ICON_SIZE = 18;
/** Outline of the "Ekle" tile (`YbzwN`, 1.5 pt `borderStrong`). */
const ADD_BORDER_WIDTH = 1.5;
const FAILED_BORDER_WIDTH = 2;
/** "Kapak" badge inset from the tile's bottom-left corner. */
const BADGE_INSET = 6;

/**
 * Picked photos with upload feedback (Pencil `ldcdM` / `fGq4D` "Fotoğraf şeridi"): an "Ekle"
 * tile, then 64 pt photo tiles. The first photo is the cover ("Kapak" badge). Uploading tiles
 * show a veil and spinner; failed tiles turn red with "Tekrar" and retry on tap. Tapping a
 * photo opens a native menu to make it the cover or remove it (long-press on failed tiles).
 * Counters, notes and labels belong to the surrounding `FormSection`.
 */
export function PhotoPickerGrid({
  photos,
  labels,
  onAdd,
  max,
  showCover = true,
  onRetry,
  onRemove,
  onSetCover,
  layout = 'strip',
  style,
}: PhotoPickerGridProps) {
  const canAdd = !!onAdd && (max === undefined || photos.length < max);

  const openMenu = (photoId: string, isCover: boolean) => {
    const options: ActionSheetOption[] = [];
    if (onSetCover && !isCover) {
      options.push({ label: labels.setCover, onPress: () => onSetCover(photoId) });
    }
    if (onRemove) {
      options.push({ label: labels.remove, destructive: true, onPress: () => onRemove(photoId) });
    }
    if (options.length > 0) {
      showActionSheet({ options, cancelLabel: labels.cancel });
    }
  };

  const tiles = (
    <>
      {canAdd ? (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={labels.addA11y}
          style={({ pressed }) => [styles.tile, styles.addTile, pressed && styles.addTilePressed]}>
          <MediaImagePlus
            width={ADD_ICON_SIZE}
            height={ADD_ICON_SIZE}
            color={colors.textPrimary}
            strokeWidth={1.5}
          />
          <Text style={styles.addLabel}>{labels.add}</Text>
        </Pressable>
      ) : null}
      {photos.map((photo, index) => {
        const status = photo.status ?? 'uploaded';
        const isCover = showCover && index === 0;
        const position = index + 1;
        const failed = status === 'failed';
        const accessibilityLabel = failed
          ? labels.failedA11y(position)
          : status === 'uploading'
            ? labels.uploadingA11y(position)
            : isCover
              ? labels.coverA11y(position)
              : labels.photoA11y(position);

        return (
          <Pressable
            key={photo.id}
            onPress={() => (failed ? onRetry?.(photo.id) : openMenu(photo.id, isCover))}
            onLongPress={() => openMenu(photo.id, isCover)}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ busy: status === 'uploading' }}
            style={({ pressed }) => [styles.tile, styles.photoTile, pressed && styles.photoPressed]}>
            <Image
              source={{ uri: photo.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
            />
            {status === 'uploading' ? (
              <View style={[styles.veil, styles.uploadingVeil]}>
                <ActivityIndicator color={colors.textInverse} />
              </View>
            ) : null}
            {failed ? (
              <View style={[styles.veil, styles.failedVeil]}>
                <Refresh
                  width={RETRY_ICON_SIZE}
                  height={RETRY_ICON_SIZE}
                  color={colors.textInverse}
                  strokeWidth={1.8}
                />
                <Text style={styles.overlayLabel}>{labels.retry}</Text>
              </View>
            ) : null}
            {isCover && !failed ? (
              <View style={styles.coverBadge}>
                <Text style={styles.overlayLabel}>{labels.cover}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </>
  );

  if (layout === 'grid') {
    return <View style={[styles.grid, style]}>{tiles}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.strip}>
      {tiles}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: ADD_BORDER_WIDTH,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  addTilePressed: {
    backgroundColor: colors.surfacePressed,
  },
  // Design "Ekle" is 11 pt; 12 medium keeps it on the type scale.
  addLabel: {
    ...typography.captionMedium,
    color: colors.textBody,
  },
  photoTile: {
    backgroundColor: colors.surfaceMuted,
  },
  photoPressed: {
    opacity: 0.85,
  },
  veil: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  uploadingVeil: {
    backgroundColor: colors.mediaUploadingVeil,
  },
  failedVeil: {
    gap: spacing.xxs,
    backgroundColor: colors.mediaFailedVeil,
    borderWidth: FAILED_BORDER_WIDTH,
    borderColor: colors.dangerText,
  },
  coverBadge: {
    position: 'absolute',
    left: BADGE_INSET,
    bottom: BADGE_INSET,
    paddingVertical: spacing.xxs,
    paddingHorizontal: BADGE_INSET,
    borderRadius: radius.tag,
    backgroundColor: colors.mediaBadge,
  },
  // Design draws 10 pt; 11 semibold (eyebrow size, no tracking) is the smallest legible step.
  overlayLabel: {
    ...typography.eyebrow,
    letterSpacing: 0,
    color: colors.textInverse,
  },
});
