import { useRouter } from 'expo-router';
import { Clock, DashboardSpeed, Motorcycle } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { RegistrationStepScreen } from '@/components/registration/RegistrationStepScreen';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { findModel } from '@/features/garage/fixtures/motorcycleModels';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import { colors, fontFamily, radius, spacing } from '@/theme';

/** Rows that can't be opened yet ("Model" before a brand, "Yıl" before a model). */
const DISABLED_OPACITY = 0.4;
/** Separator inset: aligned with the row labels (icon 16 + 20 + 12). */
const SEPARATOR_INSET = 48;

/**
 * 04.03 Kayıt tamamlama / Motor — Pencil `KLKnI` (empty) and `FuSKr` (picked). Brand, model and
 * year open the option sheets (04.04–04.06); each row waits for the one above. "Devam et"
 * needs all three and finishes registration through 04.07 "Yükleniyor"; "Atla" finishes
 * without a bike.
 */
export default function RegisterBikeScreen() {
  const { t } = useTranslation(['registration', 'common']);
  const router = useRouter();
  const { draft } = useRegistrationDraft();
  const model = findModel(draft.modelId);
  const complete = Boolean(draft.brand && model && draft.modelYear);

  const finish = () => router.replace('/register/loading');

  return (
    <RegistrationStepScreen
      step={3}
      heading={t('bike.heading')}
      description={t('bike.description')}
      ctaLabel={t('common:actions.continue')}
      onCtaPress={finish}
      ctaDisabled={!complete}
      onSkip={finish}>
      <View style={styles.body}>
        <View style={styles.card}>
          <SettingsRow
            icon={Motorcycle}
            label={t('bike.brand')}
            trailing="valueChevron"
            value={draft.brand ? motorcycleBrandNames[draft.brand] : t('bike.choose')}
            valueEmphasis={Boolean(draft.brand)}
            onPress={() => router.push('/register/bike-brand')}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon={DashboardSpeed}
            label={t('bike.model')}
            trailing="valueChevron"
            value={model?.name ?? t('bike.choose')}
            valueEmphasis={Boolean(model)}
            disabled={!draft.brand}
            style={!draft.brand && styles.disabled}
            onPress={() => router.push('/register/bike-model')}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon={Clock}
            label={t('bike.year')}
            trailing="valueChevron"
            value={draft.modelYear ? String(draft.modelYear) : t('bike.choose')}
            valueEmphasis={Boolean(draft.modelYear)}
            disabled={!model}
            style={!model && styles.disabled}
            onPress={() => router.push('/register/bike-year')}
          />
        </View>
        <Text style={styles.note}>{t('bike.mainBikeNote')}</Text>
      </View>
    </RegistrationStepScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.xxxl,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    marginLeft: SEPARATOR_INSET,
    marginRight: spacing.lg,
    backgroundColor: colors.border,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  // 12 pt at 1.25 under the card ("Primary motorcycle note").
  note: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
  },
});
