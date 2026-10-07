import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, MediaImage } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { colors, layout, radius, spacing } from '@/theme';

const PICKER_QUALITY = 0.8;

/**
 * 08.07 Fotoğraf ekle — Kaynak seç (Pencil `a7alg`): camera or library; picked photos join the
 * form and start uploading at once (`RideFormProvider`).
 */
export default function PhotoSourceSheet() {
  const { t } = useTranslation('rides');
  const insets = useSafeAreaInsets();
  const { addPhotos, photoRoom } = useRideForm();
  const [busy, setBusy] = useState(false);

  const finish = (uris: string[]) => {
    if (uris.length > 0) {
      addPhotos(uris);
    }
    router.back();
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('photoSource.cameraPermission.title'),
        t('photoSource.cameraPermission.message'),
        [
          { text: t('photoSource.permissionCancel'), style: 'cancel' },
          { text: t('photoSource.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    setBusy(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: PICKER_QUALITY,
      });
      finish(result.canceled ? [] : result.assets.map((asset) => asset.uri));
    } catch {
      // No camera (simulator): nothing to add.
    } finally {
      setBusy(false);
    }
  };

  // The system photo picker needs no library permission (PHPicker / Android photo picker).
  const pickFromLibrary = async () => {
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: photoRoom,
        orderedSelection: true,
        quality: PICKER_QUALITY,
      });
      finish(result.canceled ? [] : result.assets.slice(0, photoRoom).map((asset) => asset.uri));
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || photoRoom === 0;

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <SheetHeader title={t('photoSource.title')} />
      <View style={styles.options}>
        <View style={styles.option}>
          <SettingsRow
            icon={Camera}
            label={t('photoSource.camera')}
            description={t('photoSource.cameraHint')}
            trailing="chevron"
            onPress={takePhoto}
            disabled={disabled}
          />
        </View>
        <View style={styles.option}>
          <SettingsRow
            icon={MediaImage}
            label={t('photoSource.library')}
            description={t('photoSource.libraryHint', { count: photoRoom })}
            trailing="chevron"
            onPress={pickFromLibrary}
            disabled={disabled}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingTop: spacing.xl,
    backgroundColor: colors.surface,
  },
  options: {
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenGutter,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
