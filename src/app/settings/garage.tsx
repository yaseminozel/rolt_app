import { router, Stack } from 'expo-router';
import { Plus } from 'iconoir-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MotorcycleBrandLogo, motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { DialogModal } from '@/components/feedback/DialogModal';
import { useToast } from '@/components/feedback/ToastProvider';
import { StackedCardsIllustration } from '@/components/illustrations/StackedCardsIllustration';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { MOTORCYCLE_MODELS } from '@/features/garage/fixtures/motorcycleModels';
import { garageResult, useGarageResult } from '@/features/garage/garageFlow';
import { useOwnProfile, useUpdateOwnProfile } from '@/features/profile/queries';
import { useRiderRides } from '@/features/riders/queries';
import { useSavedRides } from '@/features/rides/queries';
import { formatNumber } from '@/i18n/format';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const TILE_SIZE = 56;
const LOGO_SIZE = 32;

/**
 * 11.01 Motorum / Boş durum (Pencil `dCCN1`) and 11.07 Motor detayı (`I0Qb89`, delete
 * confirmation `xtxb6`). Brand / model / year rows reopen the add sheet at that step. The rider has one bike (the profile's): its rides and kilometres,
 * brand / model / year, "Motoru değiştir" (the add sheet again) and "Motoru sil". Toasts:
 * "Motorun eklendi." (11.06), "Motorun silindi." (11.01 `1005:36223`).
 */
export default function GarageScreen() {
  const { t } = useTranslation('settings');
  const { showToast } = useToast();
  const { data: profile } = useOwnProfile();
  const update = useUpdateOwnProfile();
  const { data: deviceRides = [] } = useSavedRides();
  const { data: sampleRides = [] } = useRiderRides(profile?.sampleRiderId);
  const result = useGarageResult();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (result) {
      showToast({
        variant: result === 'failed' ? 'failure' : 'success',
        message: t(`garage.toast.${result}`),
      });
      garageResult.set(null);
    }
  }, [result, showToast, t]);

  const bike = profile?.bike;
  const model = bike
    ? MOTORCYCLE_MODELS.find((item) => item.brand === bike.brand && item.name === bike.model)
    : undefined;
  const localRideCount = deviceRides.length + sampleRides.length;
  const localDistanceKm =
    deviceRides.reduce((sum, ride) => sum + ride.stats.distanceM / 1000, 0) +
    sampleRides.reduce((sum, ride) => sum + ride.distanceKm, 0);
  // Supabase counts the synced rides; rides still waiting on this device may not be in it yet.
  const rideCount = Math.max(profile?.rideCount ?? 0, localRideCount);
  const distanceKm = Math.max((profile?.rideDistanceM ?? 0) / 1000, localDistanceKm);

  const openAdd = (mode: 'add' | 'change', step?: 'brand' | 'model' | 'year') =>
    router.push({ pathname: '/settings/garage-add', params: { mode, step } });

  const deleteBike = async () => {
    setConfirmDelete(false);
    try {
      await update.mutateAsync({ bike: undefined });
      showToast({ variant: 'success', message: t('garage.toast.deleted') });
    } catch {
      showToast({ variant: 'failure', message: t('garage.toast.failed') });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('garage.title') }} />
      {bike ? (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <View style={styles.bikeCard}>
            <View style={styles.tile}>
              <MotorcycleBrandLogo brand={bike.brand} size={LOGO_SIZE} />
            </View>
            <View style={styles.bikeText}>
              <Text style={styles.bikeName} numberOfLines={1}>
                {`${motorcycleBrandNames[bike.brand]} ${bike.model}`}
              </Text>
              <Text style={styles.bikeSummary}>
                {`${formatNumber(rideCount)} ${t('garage.rides')} · ${formatNumber(Math.round(distanceKm))} ${t('garage.km')}`}
              </Text>
            </View>
          </View>

          <SettingsSection title={t('garage.infoSection')} inset>
            {[
              <SettingsRow
                key="brand"
                label={t('garage.brand')}
                trailing="valueChevron"
                value={motorcycleBrandNames[bike.brand]}
                onPress={() => openAdd('change', 'brand')}
              />,
              <SettingsRow
                key="model"
                label={t('garage.model')}
                trailing="valueChevron"
                onPress={() => openAdd('change', 'model')}
                value={
                  model
                    ? t('garage.modelWithCc', {
                        model: bike.model,
                        cc: formatNumber(model.displacementCc),
                      })
                    : bike.model
                }
              />,
              <SettingsRow
                key="year"
                label={t('garage.year')}
                trailing="valueChevron"
                value={bike.year ? String(bike.year) : '–'}
                onPress={() => openAdd('change', 'year')}
              />,
            ]}
          </SettingsSection>

          <Text style={styles.note}>{t('garage.note')}</Text>

          <View style={styles.actions}>
            <Button
              variant="tonal"
              size="lg"
              label={t('garage.change')}
              onPress={() => openAdd('change')}
            />
            <Button
              variant="text"
              destructive
              size="lg"
              label={t('garage.delete')}
              onPress={() => setConfirmDelete(true)}
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <StackedCardsIllustration />
          <View style={styles.emptyText}>
            <Text style={styles.emptyTitle} accessibilityRole="header">
              {t('garage.empty.title')}
            </Text>
            <Text style={styles.emptyDescription}>{t('garage.empty.description')}</Text>
          </View>
          <Button
            icon={Plus}
            label={t('garage.empty.add')}
            onPress={() => openAdd('add')}
            style={styles.emptyButton}
          />
        </View>
      )}

      <DialogModal
        visible={confirmDelete}
        onRequestClose={() => setConfirmDelete(false)}
        status="error"
        title={t('garage.deleteDialog.title')}
        description={t('garage.deleteDialog.description')}
        actions={[
          <Button
            key="cancel"
            variant="outlined"
            label={t('garage.deleteDialog.cancel')}
            onPress={() => setConfirmDelete(false)}
            style={styles.flex}
          />,
          <Button
            key="delete"
            destructive
            label={t('garage.deleteDialog.confirm')}
            onPress={deleteBike}
            style={styles.flex}
          />,
        ]}
      />
    </>
  );
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
    gap: spacing.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  bikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bikeText: {
    flex: 1,
    gap: spacing.xs,
  },
  bikeName: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  bikeSummary: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  note: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: -spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 256 - 113,
    paddingHorizontal: layout.screenGutter,
    gap: spacing.xxl,
    backgroundColor: colors.surface,
  },
  emptyText: {
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'center',
  },
});
