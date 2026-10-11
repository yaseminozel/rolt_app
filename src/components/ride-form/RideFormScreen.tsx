import { router, Stack } from 'expo-router';
import { Xmark } from 'iconoir-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DialogModal } from '@/components/feedback/DialogModal';
import { useToast } from '@/components/feedback/ToastProvider';
import { Button } from '@/components/ui/Button';
import { haptics } from '@/features/haptics/haptics';
import { useDeleteRide, useSaveRide } from '@/features/rides/queries';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { colors, layout, spacing, typography } from '@/theme';

import { RideDetailsForm } from './RideDetailsForm';

const CLOSE_SIZE = 44;
/** CTA (48) and its padding, for toasts above the bar. */
const BAR_HEIGHT = 48 + spacing.lg * 2;

type RideFormScreenProps = {
  /** `save`: a new ride (08.05); `edit`: a saved one (09.07). */
  mode: 'save' | 'edit';
};

/**
 * "Sürüşü kaydet" (08.05) and "Sürüşü düzenle" (09.07). Saving waits for photo uploads, writes
 * the ride to the device and only then reports success (P0); a failure keeps the form with
 * "Sürüş kaydedilemedi". A failed photo blocks saving only online and when the server refused
 * it; one that failed on the connection is saved with the ride and uploaded by its sync. Closing a new ride asks first (08.10), deleting always does (08.09).
 */
export function RideFormScreen({ mode }: RideFormScreenProps) {
  const { t } = useTranslation('rides');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { ride, values, reset, failedPhotosCanWait } = useRideForm();
  const saveRide = useSaveRide();
  const deleteRide = useDeleteRide();
  const [dialog, setDialog] = useState<'exit' | 'delete' | null>(null);
  const [saveRequested, setSaveRequested] = useState(false);
  const afterDismiss = useRef<(() => void) | null>(null);

  const uploading = values.photos.filter((photo) => photo.status === 'uploading').length;
  const failed = values.photos.some((photo) => photo.status === 'failed');
  const uploaded = values.photos.filter((photo) => photo.status === 'uploaded').length;
  const saving = saveRequested || saveRide.isPending;
  const toastOffset = BAR_HEIGHT + insets.bottom;

  // "Kaydediliyor": waits for uploads still running, then stores the ride.
  useEffect(() => {
    if (!saveRequested || uploading > 0 || saveRide.isPending) {
      return;
    }
    saveRide
      .mutateAsync({ id: ride.id, details: values })
      .then((saved) => {
        // Felt only once the ride is really on the device (P0).
        haptics.success();
        if (mode === 'save') {
          router.replace({ pathname: '/rides/[rideId]/saved', params: { rideId: saved.id } });
        } else {
          router.back();
        }
      })
      .catch(() =>
        showToast({ variant: 'failure', message: t('form.saveFailed'), bottomOffset: toastOffset }),
      )
      .finally(() => setSaveRequested(false));
  }, [mode, ride.id, saveRequested, saveRide, showToast, t, toastOffset, uploading, values]);

  const close = () => {
    if (mode === 'save') {
      setDialog('exit');
    } else {
      reset();
      router.back();
    }
  };

  // Leaving or deleting runs after the dialog has hidden (iOS can't present over a closing modal).
  const runAfterDialog = (action: () => void) => {
    afterDismiss.current = action;
    setDialog(null);
    if (Platform.OS !== 'ios') {
      afterDismiss.current = null;
      action();
    }
  };

  const leave = (toast?: string) => {
    const id = ride.id;
    router.back();
    deleteRide.mutate(id);
    if (toast) {
      showToast({ variant: 'success', message: toast });
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: mode === 'save' ? t('form.title') : t('form.editTitle'),
          headerBackVisible: false,
          headerLeft: () => null,
          gestureEnabled: false,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={close}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={t('form.close')}
              style={styles.close}>
              <Xmark width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!saving}>
          <RideDetailsForm locked={saving} onDelete={() => setDialog('delete')} />
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.lg }]}>
          {saving && values.photos.length > 0 && uploading > 0 ? (
            <Text style={styles.uploadNote}>
              {t('form.uploadingPhotos', { done: uploaded, total: values.photos.length })}
            </Text>
          ) : null}
          <Button
            size="lg"
            label={mode === 'save' ? t('form.save') : t('form.saveChanges')}
            loading={saving}
            loadingLabel={t('form.saving')}
            disabled={failed && !failedPhotosCanWait && !saving}
            onPress={() => setSaveRequested(true)}
            testID="ride-form-save"
          />
        </View>
      </KeyboardAvoidingView>

      <DialogModal
        visible={dialog === 'exit'}
        onRequestClose={() => setDialog(null)}
        onDismiss={() => {
          afterDismiss.current?.();
          afterDismiss.current = null;
        }}
        status="error"
        title={t('form.exitDialog.title')}
        description={t('form.exitDialog.description')}
        actionsLayout="column"
        actions={[
          <Button
            key="leave"
            label={t('form.exitDialog.confirm')}
            onPress={() => runAfterDialog(() => leave())}
          />,
          <Button
            key="stay"
            variant="text"
            label={t('form.exitDialog.cancel')}
            onPress={() => setDialog(null)}
          />,
        ]}
      />
      <DialogModal
        visible={dialog === 'delete'}
        onRequestClose={() => setDialog(null)}
        onDismiss={() => {
          afterDismiss.current?.();
          afterDismiss.current = null;
        }}
        status="error"
        title={t('record.deleteDialog.title')}
        description={
          mode === 'save' ? t('record.deleteDialog.description') : t('detail.deleteDescription')
        }
        actionsLayout="column"
        actions={[
          <Button
            key="delete"
            destructive
            label={t('record.deleteDialog.confirm')}
            onPress={() =>
              runAfterDialog(() =>
                mode === 'save' ? leave(t('form.deleted')) : deleteFromEdit(ride.id),
              )
            }
          />,
          <Button
            key="cancel"
            variant="text"
            label={t('record.deleteDialog.cancel')}
            onPress={() => setDialog(null)}
          />,
        ]}
      />
    </View>
  );

  function deleteFromEdit(id: string) {
    // Back to the profile with "Sürüş silindi" (09.01 `tJEMc`).
    router.dismissAll();
    router.navigate('/profile');
    deleteRide.mutate(id);
    showToast({ variant: 'success', message: t('form.deleted') });
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.sm,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  close: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  uploadNote: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
