import { Image } from 'expo-image';
import { Plus } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UploadBox } from '@/components/media/UploadBox';
import type { RidePhoto } from '@/features/rides/types';
import { formatNumber } from '@/i18n/format';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';

const TILE = { width: 72, height: 80 };
const PROGRESS_TRACK = 48;

type RidePhotosFieldProps = {
  photos: RidePhoto[];
  max: number;
  onAdd: () => void;
  onRetry: (photoId: string) => void;
  onRemove: (photoId: string) => void;
  disabled?: boolean;
  /** Rides recorded on a route call them "Rota görselleri" (08.05 `1083:20403`). */
  label?: string;
};

/**
 * "Sürüş görselleri" (08.05, 08.07 `SM7xm` / `r75GtO`): label and counter, then an upload box
 * while empty, otherwise 72 × 80 tiles (progress "%64", failed with "Tekrar dene") and "Ekle".
 * Tapping a photo offers "Kaldır".
 */
export function RidePhotosField({
  photos,
  max,
  onAdd,
  onRetry,
  onRemove,
  disabled,
  label,
}: RidePhotosFieldProps) {
  const { t } = useTranslation('rides');
  const failed = photos.filter((photo) => photo.status === 'failed').length;

  const openMenu = (photo: RidePhoto) =>
    showActionSheet({
      options: [
        { label: t('form.photos.remove'), destructive: true, onPress: () => onRemove(photo.id) },
      ],
      cancelLabel: t('form.photos.cancel'),
    });

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label ?? t('form.photos.label')}</Text>
        <Text style={styles.counter}>{`${photos.length}/${max}`}</Text>
      </View>
      {photos.length === 0 ? (
        <UploadBox
          title={t('form.photos.upload')}
          hint={t('form.photos.uploadHint')}
          onPress={onAdd}
          disabled={disabled}
          dashed
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          style={styles.stripScroll}>
          {photos.map((photo, index) => (
            <Pressable
              key={photo.id}
              disabled={disabled}
              onPress={() => (photo.status === 'failed' ? onRetry(photo.id) : openMenu(photo))}
              onLongPress={() => openMenu(photo)}
              accessibilityRole="button"
              accessibilityLabel={
                photo.status === 'failed'
                  ? t('form.photos.failedA11y', { index: index + 1 })
                  : photo.status === 'uploading'
                    ? t('form.photos.uploadingA11y', { index: index + 1 })
                    : t('form.photos.photoA11y', { index: index + 1 })
              }
              style={[styles.tile, photo.status === 'failed' && styles.tileFailed]}>
              <Image
                source={{ uri: photo.uri }}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
              />
              {photo.status === 'uploading' ? (
                <View style={styles.veil}>
                  <Text style={styles.veilText}>
                    {formatNumber(photo.progress, { style: 'percent', maximumFractionDigits: 0 })}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressBar, { width: PROGRESS_TRACK * photo.progress }]}
                    />
                  </View>
                </View>
              ) : photo.status === 'failed' ? (
                <View style={styles.veil}>
                  <Text style={styles.retryText}>{t('form.photos.retry')}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
          {photos.length < max ? (
            <Pressable
              onPress={onAdd}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t('form.photos.add')}
              style={({ pressed }) => [styles.addTile, pressed && styles.pressed]}>
              <Plus width={16} height={16} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.addLabel}>{t('form.photos.add')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
      {failed > 0 ? (
        <Text style={styles.error}>{t('form.photos.failed', { count: failed })}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  counter: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  stripScroll: {
    marginHorizontal: -spacing.lg,
  },
  strip: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  tile: {
    width: TILE.width,
    height: TILE.height,
    borderRadius: radius.sm,
    overflow: 'hidden',
    boxShadow: shadows.raised,
    backgroundColor: colors.surfaceMuted,
  },
  tileFailed: {
    borderWidth: 2,
    borderColor: colors.mapFinish,
  },
  veil: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.mediaUploadingVeil,
  },
  veilText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.textInverse,
  },
  progressTrack: {
    width: PROGRESS_TRACK,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.mediaProgressTrack,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textInverse,
  },
  retryText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: colors.textInverse,
    textAlign: 'center',
  },
  addTile: {
    width: TILE.width,
    height: TILE.height,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
  },
  addLabel: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.dangerText,
  },
});
