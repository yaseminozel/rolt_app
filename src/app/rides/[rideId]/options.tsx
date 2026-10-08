import { router } from 'expo-router';
import { EditPencil, Globe, ShareAndroid, Trash } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { colors, layout, radius, spacing } from '@/theme';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';
import { openShareRide } from '@/features/rides/openShareRide';

/**
 * 09.06 Sürüş detayı — Seçenekler (Pencil `W8Hilq`): edit, visibility, share and delete. The
 * delete confirmation opens on the detail screen (`?confirm=delete`) once this sheet is closed.
 */
export default function RideOptionsSheet() {
  const { t } = useTranslation('rides');
  const bottomPadding = useSheetBottomPadding((bottom) => bottom + spacing.lg);
  const { ride } = useRideForm();
  const params = { rideId: ride.id };

  return (
    <View style={[styles.sheet, { paddingBottom: bottomPadding }]}>
      <SheetHeader title={t('options.title')} />
      <View style={styles.card}>
        <SettingsRow
          icon={EditPencil}
          label={t('options.edit')}
          trailing="chevron"
          onPress={() => {
            router.back();
            router.push({ pathname: '/rides/[rideId]/edit', params });
          }}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={Globe}
          label={t('options.visibility')}
          trailing="valueChevron"
          value={t(`visibility.${ride.visibility}`)}
          onPress={() => {
            router.back();
            router.push({
              pathname: '/rides/[rideId]/visibility',
              params: { ...params, apply: 'ride' },
            });
          }}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={ShareAndroid}
          label={t('options.share')}
          trailing="chevron"
          onPress={() => {
            router.back();
            openShareRide(ride.id);
          }}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={Trash}
          label={t('options.delete')}
          destructive
          trailing="none"
          onPress={() =>
            router.dismissTo({
              pathname: '/rides/[rideId]',
              params: { ...params, confirm: 'delete' },
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingTop: spacing.xl,
    backgroundColor: colors.surface,
  },
  card: {
    marginTop: spacing.md,
    marginHorizontal: layout.screenGutter,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
});
