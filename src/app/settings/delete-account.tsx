import { router, Stack } from 'expo-router';
import { Bookmark, Motorcycle, PathArrow, User } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DialogModal } from '@/components/feedback/DialogModal';
import { useToast } from '@/components/feedback/ToastProvider';
import { SelectField } from '@/components/ride-form/SelectField';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth } from '@/features/auth/AuthProvider';
import { ownProfileRepository } from '@/features/profile/ownProfileRepository';
import { useOwnProfile } from '@/features/profile/queries';
import { useRiderRides, useRiderRoutes } from '@/features/riders/queries';
import { useSavedRides } from '@/features/rides/queries';
import { ridesRepository } from '@/features/rides/ridesRepository';
import { useSavedRoutes } from '@/features/routes/SavedRoutesProvider';
import { formatNumber } from '@/i18n/format';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors, layout, spacing, typography } from '@/theme';

/** "Neden ayrılıyorsun?" options; the list isn't drawn, so these follow common exit surveys. */
const LEAVE_REASONS = ['notRiding', 'otherApp', 'privacy', 'notUseful', 'other'] as const;
type LeaveReason = (typeof LEAVE_REASONS)[number];

/**
 * 10.16 Hesabı sil (Figma `1005:35917`, "Onaylandı" `1005:35977`, "Son onay" `1005:35951`):
 * what will be deleted with this account's own numbers, an optional reason, a required
 * acknowledgement, then a last confirmation dialog. Deleting starts over from onboarding.
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation('settings');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { session, deleteAccount } = useAuth();
  const { data: profile } = useOwnProfile();
  const { data: deviceRides = [] } = useSavedRides();
  const { data: sampleRides = [] } = useRiderRides(profile?.sampleRiderId);
  const { data: suggestedRoutes = [] } = useRiderRoutes(profile?.sampleRiderId);
  const { savedIds, setSaved } = useSavedRoutes();
  const [reason, setReason] = useState<LeaveReason | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const rideCount = deviceRides.length + sampleRides.length;

  const chooseReason = () =>
    showActionSheet({
      title: t('deleteAccount.reasonLabel'),
      options: LEAVE_REASONS.map((item) => ({
        label: t(`deleteAccount.reasons.${item}`),
        onPress: () => setReason(item),
      })),
      cancelLabel: t('deleteAccount.cancel'),
    });

  const confirmDelete = async () => {
    if (!session) {
      return;
    }
    setDeleting(true);
    try {
      // The account goes first; this device's copies of its data follow.
      await deleteAccount(reason ?? undefined);
      await Promise.all([
        ...deviceRides.map((ride) => ridesRepository.remove(ride.id)),
        ridesRepository.listDrafts().then((drafts) =>
          Promise.all(drafts.map((ride) => ridesRepository.remove(ride.id))),
        ),
        ownProfileRepository.remove(session.userId),
      ]);
      savedIds.forEach((id) => setSaved(id, false));
      setConfirming(false);
      router.dismissAll();
      router.replace('/onboarding');
    } catch {
      setDeleting(false);
      setConfirming(false);
      showToast({ variant: 'failure', message: t('deleteAccount.failed') });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('deleteAccount.title') }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.warning}>
          <Text style={styles.heading} accessibilityRole="header">
            {t('deleteAccount.heading')}
          </Text>
          <Text style={styles.description}>{t('deleteAccount.description')}</Text>
        </View>

        <SettingsSection inset>
          {[
            <SettingsRow
              key="rides"
              icon={Motorcycle}
              label={t('deleteAccount.items.rides')}
              description={t('deleteAccount.items.ridesDetail', {
                count: rideCount,
                value: formatNumber(rideCount),
              })}
              trailing="none"
            />,
            <SettingsRow
              key="routes"
              icon={PathArrow}
              label={t('deleteAccount.items.routes')}
              description={t('deleteAccount.items.routesDetail', {
                count: suggestedRoutes.length,
                value: formatNumber(suggestedRoutes.length),
              })}
              trailing="none"
            />,
            <SettingsRow
              key="saved"
              icon={Bookmark}
              label={t('deleteAccount.items.saved')}
              description={t('deleteAccount.items.savedDetail', {
                count: savedIds.length,
                value: formatNumber(savedIds.length),
              })}
              trailing="none"
            />,
            <SettingsRow
              key="profile"
              icon={User}
              label={t('deleteAccount.items.profile')}
              description={t('deleteAccount.items.profileDetail')}
              trailing="none"
            />,
          ]}
        </SettingsSection>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('deleteAccount.reasonLabel')}</Text>
            <Text style={styles.optional}>{t('deleteAccount.optional')}</Text>
          </View>
          <SelectField
            value={reason ? t(`deleteAccount.reasons.${reason}`) : ''}
            placeholder={t('deleteAccount.reasonPlaceholder')}
            accessibilityLabel={t('deleteAccount.reasonLabel')}
            onPress={chooseReason}
          />
        </View>

        <Checkbox
          checked={acknowledged}
          onPress={() => setAcknowledged((value) => !value)}
          label={t('deleteAccount.acknowledge')}
        />
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          destructive
          label={t('deleteAccount.submit')}
          disabled={!acknowledged}
          onPress={() => setConfirming(true)}
        />
      </View>

      <DialogModal
        visible={confirming}
        onRequestClose={() => (deleting ? undefined : setConfirming(false))}
        status="error"
        title={t('deleteAccount.confirm.title')}
        description={t('deleteAccount.confirm.description', { email: session?.email ?? '' })}
        actionsLayout="column"
        actions={[
          <Button
            key="delete"
            destructive
            label={t('deleteAccount.confirm.delete')}
            loading={deleting}
            onPress={confirmDelete}
          />,
          <Button
            key="cancel"
            variant="text"
            label={t('deleteAccount.cancel')}
            disabled={deleting}
            onPress={() => setConfirming(false)}
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
  content: {
    gap: spacing.xxxl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  warning: {
    gap: spacing.sm,
  },
  heading: {
    ...typography.titleSmall,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  description: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  field: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.bodyMedium,
    lineHeight: 17,
    color: colors.textPrimary,
  },
  optional: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  bar: {
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
