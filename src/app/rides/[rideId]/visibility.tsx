import { router, useLocalSearchParams } from 'expo-router';
import { Globe, Group, InfoCircle, Lock } from 'iconoir-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InfoNote } from '@/components/feedback/InfoNote';
import { SheetHeader } from '@/components/feedback/SheetHeader';
import { ChoiceRow } from '@/components/ride-form/ChoiceRow';
import { Button } from '@/components/ui/Button';
import { useUpdateRide } from '@/features/rides/queries';
import { useRideForm } from '@/features/rides/RideFormProvider';
import { RIDE_VISIBILITIES, type RideVisibility } from '@/features/rides/types';
import { colors, layout, spacing } from '@/theme';

const ICONS = { public: Globe, followers: Group, private: Lock } as const;

/**
 * 08.08 Görünürlük seç (Pencil `Tz4Yv`): Herkes / Takipçilerim / Sadece ben, applied with
 * "Uygula". From the save / edit form it changes the form; from a saved ride's options
 * (`?apply=ride`) it is stored right away.
 */
export default function VisibilitySheet() {
  const { t } = useTranslation('rides');
  const insets = useSafeAreaInsets();
  const { apply } = useLocalSearchParams<{ apply?: 'ride' }>();
  const { ride, values, setValue } = useRideForm();
  const updateRide = useUpdateRide();
  const current = apply === 'ride' ? ride.visibility : values.visibility;
  const [choice, setChoice] = useState<RideVisibility>(current);

  const handleApply = async () => {
    setValue('visibility', choice);
    if (apply === 'ride' && choice !== ride.visibility) {
      await updateRide.mutateAsync({ id: ride.id, patch: { visibility: choice } });
    }
    router.back();
  };

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.sm }]}
      bounces={false}>
      <SheetHeader title={t('visibility.sheet.title')} subtitle={t('visibility.sheet.subtitle')} />
      <View style={styles.options} accessibilityRole="radiogroup">
        {RIDE_VISIBILITIES.map((option, index) => (
          <ChoiceRow
            key={option}
            icon={ICONS[option]}
            label={t(`visibility.${option}`)}
            description={t(`visibility.descriptions.${option}`)}
            selected={choice === option}
            divided={index > 0}
            onPress={() => setChoice(option)}
          />
        ))}
      </View>
      <InfoNote text={t('visibility.sheet.note')} icon={InfoCircle} style={styles.note} />
      <Button
        label={t('visibility.sheet.apply')}
        onPress={handleApply}
        loading={updateRide.isPending}
        style={styles.apply}
      />
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
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xs,
  },
  note: {
    marginHorizontal: layout.screenGutter,
    marginTop: spacing.sm,
  },
  apply: {
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xl,
  },
});
