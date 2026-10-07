import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, MediaImageList, ShieldCheck } from 'iconoir-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { PhotoSourceOptions } from '@/components/media/PhotoSourceOptions';
import { SuggestedPhotosStrip } from '@/components/media/SuggestedPhotosStrip';
import { Button } from '@/components/ui/Button';
import { useRouteSuggestion } from '@/features/route-suggestion/RouteSuggestionProvider';
import { MAX_SUGGESTION_PHOTOS } from '@/features/route-suggestion/types';
import {
  resolveSuggestionUri,
  useRoutePhotoSuggestions,
} from '@/features/route-suggestion/useRoutePhotoSuggestions';
import type { LngLat } from '@/features/routes/types';
import { colors, layout, spacing, typography } from '@/theme';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';

const PICKER_QUALITY = 0.8;
const PRIVACY_ICON_SIZE = 14;

/**
 * Suggested photos already added in this session (library id → file uri), so reopening the
 * sheet does not offer them again while they are still in the draft.
 */
const addedSuggestionUris = new Map<string, string>();

/**
 * 04.2 Rota öner / Fotoğraf ekle (Pencil `iJrop`), a native form sheet sized to its content.
 *
 * - "Bu rotada çektiğin fotoğraflar": recent library photos taken near the route; hidden while
 *   scanning, without photo access, or when nothing matches. The CTA adds the selected ones.
 * - "Fotoğraf çek" / "Galeriden seç" add their photos at once (plus any selected suggestions)
 *   and close the sheet. Every source is capped by the free slots (max 10 per route).
 */
export default function SuggestRouteAddPhotosScreen() {
  const { t } = useTranslation('routeSuggestionDetails');
  const router = useRouter();
  const bottomPadding = useSheetBottomPadding((bottom) =>
    Math.max(bottom + spacing.sm, spacing.xxl),
  );
  const { draft, addPhotos } = useRouteSuggestion();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Match against the calculated road line; fall back to the picked waypoints.
  const line = useMemo<LngLat[]>(
    () =>
      draft.preview && draft.preview.geometry.length > 0
        ? draft.preview.geometry
        : draft.waypoints.flatMap((waypoint) =>
            waypoint.place ? [waypoint.place.coordinates] : [],
          ),
    [draft.preview, draft.waypoints],
  );
  const scan = useRoutePhotoSuggestions(line);

  const suggestions = useMemo(() => {
    const draftUris = new Set(draft.photos.map((photo) => photo.uri));
    return scan.photos
      .filter((photo) => {
        const addedUri = addedSuggestionUris.get(photo.id);
        return !addedUri || !draftUris.has(addedUri);
      })
      .map((photo) => ({ id: photo.id, uri: photo.id }));
  }, [scan.photos, draft.photos]);

  const freeSlots = Math.max(0, MAX_SUGGESTION_PHOTOS - draft.photos.length);
  const slotsAfterSelection = Math.max(0, freeSlots - selectedIds.length);
  const showSuggestions = scan.status === 'ready' && suggestions.length > 0;

  const toggleSuggestion = (photoId: string) => {
    setSelectedIds((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : current.length < freeSlots
          ? [...current, photoId]
          : current,
    );
  };

  /** Adds the selected suggestions (in the order picked), then `pickedUris`, and closes. */
  const commit = async (pickedUris: string[]) => {
    setBusy(true);
    try {
      const resolved = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            const uri = await resolveSuggestionUri({ id });
            addedSuggestionUris.set(id, uri);
            return uri;
          } catch {
            return null;
          }
        }),
      );
      const uris = [...resolved.filter((uri): uri is string => uri !== null), ...pickedUris];
      if (uris.length > 0) {
        addPhotos(uris);
      }
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('addPhotos.cameraPermission.title'), t('addPhotos.cameraPermission.message'), [
        { text: t('addPhotos.permissionCancel'), style: 'cancel' },
        { text: t('addPhotos.openSettings'), onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: PICKER_QUALITY,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (asset) {
        await commit([asset.uri]);
      }
    } catch {
      // No camera available (simulator); nothing to add.
    }
  };

  // The system photo picker needs no library permission (PHPicker / Android photo picker).
  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: slotsAfterSelection,
      orderedSelection: true,
      quality: PICKER_QUALITY,
    });
    if (!result.canceled && result.assets.length > 0) {
      await commit(result.assets.slice(0, slotsAfterSelection).map((asset) => asset.uri));
    }
  };

  const sourcesDisabled = busy || slotsAfterSelection === 0;

  return (
    <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
      <SheetHeader
        title={t('addPhotos.title')}
        subtitle={t('addPhotos.description', { count: MAX_SUGGESTION_PHOTOS })}
        style={styles.header}
      />

      <View style={styles.body}>
        {showSuggestions ? (
          <SuggestedPhotosStrip
            title={t('addPhotos.suggested.title')}
            countLabel={t('addPhotos.suggested.found', { count: suggestions.length })}
            note={t('addPhotos.suggested.note')}
            photos={suggestions}
            selectedIds={selectedIds}
            onToggle={toggleSuggestion}
            selectionLocked={selectedIds.length >= freeSlots}
            photoAccessibilityLabel={(index) => t('addPhotos.suggested.photoA11y', { index })}
          />
        ) : null}

        <PhotoSourceOptions
          options={[
            {
              key: 'camera',
              icon: Camera,
              label: t('addPhotos.camera'),
              onPress: takePhoto,
              disabled: sourcesDisabled,
            },
            {
              key: 'library',
              icon: MediaImageList,
              label: t('addPhotos.gallery'),
              onPress: pickFromLibrary,
              disabled: sourcesDisabled,
            },
          ]}
        />

        <View style={styles.privacy}>
          <ShieldCheck
            width={PRIVACY_ICON_SIZE}
            height={PRIVACY_ICON_SIZE}
            color={colors.success}
            strokeWidth={1.5}
          />
          <Text style={styles.privacyText}>{t('addPhotos.privacy')}</Text>
        </View>

        {showSuggestions ? (
          <Button
            label={
              selectedIds.length > 0
                ? t('addPhotos.cta', { count: selectedIds.length })
                : t('addPhotos.ctaEmpty')
            }
            onPress={() => commit([])}
            disabled={selectedIds.length === 0}
            loading={busy}
            size="lg"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No flex: the `fitToContents` detent measures this view.
  sheet: {
    backgroundColor: colors.surface,
  },
  // The native grabber sits above the title (design: handle at 10 pt, title block at 30 pt).
  header: {
    paddingTop: spacing.xxl,
  },
  body: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenGutter,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  privacyText: {
    ...typography.captionMedium,
    flex: 1,
    color: colors.success,
  },
});
