import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { RideTypeListItem } from '@/components/ride/RideTypeListItem';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { RIDE_TYPES } from '@/features/rides/rideTypes';
import { colors, spacing } from '@/theme';

/** 08.06 Sürüş tipi seç (Pencil `JtVH6`): picking a type applies it and closes the sheet. */
export default function RideTypeSheet() {
  const { t } = useTranslation('rides');
  const insets = useSafeAreaInsets();
  const { values, setValue } = useRideForm();

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.sm }]}
      bounces={false}>
      <SheetHeader title={t('rideTypeSheet.title')} subtitle={t('rideTypeSheet.subtitle')} />
      <ScrollView
        scrollEnabled={false}
        accessibilityRole="radiogroup"
        contentContainerStyle={styles.options}>
        {RIDE_TYPES.map((type) => (
          <RideTypeListItem
            key={type}
            type={type}
            selected={values.rideType === type}
            onPress={() => {
              setValue('rideType', type);
              router.back();
            }}
          />
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
  },
  content: {
    paddingTop: spacing.xl,
  },
  options: {
    gap: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
