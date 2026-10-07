import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SheetHeader } from '@/components/feedback/SheetHeader';
import { useRideForm } from '@/features/rides/RideFormProvider';
import type { RoadSurface, RouteDifficulty } from '@/features/routes/types';
import { colors, spacing } from '@/theme';
import { useSheetBottomPadding } from '@/lib/useSheetBottomPadding';

import { ChoiceRow } from './ChoiceRow';

const DIFFICULTIES: readonly RouteDifficulty[] = ['easy', 'moderate', 'hard'];
const SURFACES: readonly RoadSurface[] = ['asphalt', 'mixed', 'gravel'];

/**
 * "Zorluk seviyesi" / "Yol tipi" sheet of the ride form. The design draws the rows but not their
 * pickers, so they reuse the visibility sheet's radio rows; a choice applies and closes.
 */
export function DetailChoiceSheet({ field }: { field: 'difficulty' | 'surface' }) {
  const { t } = useTranslation(['rides', 'routes']);
  const bottomPadding = useSheetBottomPadding((bottom) => bottom + spacing.lg);
  const { values, setValue } = useRideForm();

  const options =
    field === 'difficulty'
      ? DIFFICULTIES.map((value) => ({ value, label: t(`routes:difficulty.${value}`) }))
      : SURFACES.map((value) => ({ value, label: t(`routes:surface.${value}`) }));

  const select = (value: string) => {
    if (field === 'difficulty') {
      setValue('difficulty', value as RouteDifficulty);
    } else {
      setValue('surface', value as RoadSurface);
    }
    router.back();
  };

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      bounces={false}>
      <SheetHeader
        title={field === 'difficulty' ? t('form.details.difficulty') : t('form.details.surface')}
      />
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((option, index) => (
          <ChoiceRow
            key={option.value}
            label={option.label}
            selected={values[field] === option.value}
            divided={index > 0}
            onPress={() => select(option.value)}
          />
        ))}
      </View>
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
    paddingTop: spacing.xs,
  },
});
