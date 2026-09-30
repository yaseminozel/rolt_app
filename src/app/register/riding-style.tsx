import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { InfoNote } from '@/components/feedback/InfoNote';
import { RegistrationStepScreen } from '@/components/registration/RegistrationStepScreen';
import { roadPreferenceIcons } from '@/components/registration/roadPreferenceIcons';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import {
  EXPERIENCE_RANGES,
  RIDING_TEMPOS,
  ROAD_PREFERENCES,
  type ExperienceRange,
  type RidingTempo,
  type RoadPreference,
} from '@/features/registration/types';
import { colors, spacing, typography } from '@/theme';

/** Section spacing inside Fv4ol ("Bölüm / …" gap 10). */
const SECTION_GAP = 10;
/**
 * The segmented controls always show a selection; with nothing chosen yet they start on the
 * middle option, which reads as a neutral default rather than a claim about the rider.
 */
const DEFAULT_TEMPO: RidingTempo = 'balanced';
const DEFAULT_EXPERIENCE: ExperienceRange = 'threeToFive';

/**
 * 00.11 Kayıt / 4 · Sürüş tarzı (Pencil `Fv4ol`). Everything is optional.
 * "Kaydı tamamla" saves the answers; "Atla" goes to 00.12 without saving them.
 */
export default function RegisterRidingStyleScreen() {
  const { t } = useTranslation('registration');
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();

  const [roads, setRoads] = useState<RoadPreference[]>(draft.roadPreferences);
  const [tempo, setTempo] = useState<RidingTempo>(draft.tempo ?? DEFAULT_TEMPO);
  const [experience, setExperience] = useState<ExperienceRange>(draft.experience ?? DEFAULT_EXPERIENCE);

  const toggleRoad = (road: RoadPreference) =>
    setRoads((current) => (current.includes(road) ? current.filter((item) => item !== road) : [...current, road]));

  const handleSubmit = () => {
    // Keep the design's chip order regardless of tap order.
    updateDraft({
      roadPreferences: ROAD_PREFERENCES.filter((road) => roads.includes(road)),
      tempo,
      experience,
    });
    router.push('/register/complete');
  };

  const handleSkip = () => {
    updateDraft({ roadPreferences: [], tempo: undefined, experience: undefined });
    router.push('/register/complete');
  };

  const [tempoA, tempoB, tempoC] = RIDING_TEMPOS;
  const [experienceA, experienceB, experienceC] = EXPERIENCE_RANGES;

  return (
    <RegistrationStepScreen
      step={4}
      heading={t('ridingStyle.heading')}
      description={t('ridingStyle.description')}
      ctaLabel={t('ridingStyle.submit')}
      onCtaPress={handleSubmit}
      onSkip={handleSkip}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t('ridingStyle.roadsLabel')}</Text>
          <Text style={styles.hint}>{t('ridingStyle.roadsHint')}</Text>
        </View>
        <View style={styles.chips} accessibilityLabel={t('ridingStyle.roadsLabel')}>
          {ROAD_PREFERENCES.map((road) => (
            <SelectableChip
              key={road}
              label={t(`roadPreferences.${road}`)}
              icon={roadPreferenceIcons[road]}
              selected={roads.includes(road)}
              onPress={() => toggleRoad(road)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('ridingStyle.tempoLabel')}</Text>
        <SegmentedControl
          accessibilityLabel={t('ridingStyle.tempoLabel')}
          options={[
            { value: tempoA, label: t(`tempo.${tempoA}`) },
            { value: tempoB, label: t(`tempo.${tempoB}`) },
            { value: tempoC, label: t(`tempo.${tempoC}`) },
          ]}
          value={tempo}
          onChange={setTempo}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('ridingStyle.experienceLabel')}</Text>
        <SegmentedControl
          accessibilityLabel={t('ridingStyle.experienceLabel')}
          options={[
            { value: experienceA, label: t(`experience.${experienceA}`) },
            { value: experienceB, label: t(`experience.${experienceB}`) },
            { value: experienceC, label: t(`experience.${experienceC}`) },
          ]}
          value={experience}
          onChange={setExperience}
        />
      </View>

      <InfoNote text={t('ridingStyle.note')} />
    </RegistrationStepScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: SECTION_GAP,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.bodySemibold,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
