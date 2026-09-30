import * as Location from 'expo-location';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { InfoNote } from '@/components/feedback/InfoNote';
import { GarageSummaryCard, type GarageSummaryBike } from '@/components/registration/GarageSummaryCard';
import { RegistrationStepScreen, REGISTRATION_STEP_COUNT } from '@/components/registration/RegistrationStepScreen';
import { useAuth } from '@/features/auth/AuthProvider';
import { findModel } from '@/features/garage/fixtures/motorcycleModels';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import type { RegistrationDraft } from '@/features/registration/types';
import { formatNumber } from '@/i18n/format';

/**
 * 00.12 Kayıt / Tamamlandı (Pencil `LreVd`). Back and swipe-back are disabled by the layout.
 * "Keşfetmeye başla" asks for foreground location (background is requested by Record),
 * then finishes the profile whatever the answer; the root guard then routes into the app.
 * Skipped data degrades gracefully: no bike → no bike band and a "Profilin hazır" heading;
 * no photo → person glyph; no city → handle only; no preferences → no tag section.
 */
export default function RegisterCompleteScreen() {
  const { t } = useTranslation(['registration', 'common', 'garage']);
  const { completeProfile } = useAuth();
  const { draft } = useRegistrationDraft();
  const [submitting, setSubmitting] = useState(false);

  const separator = t('listSeparator');
  const bike = useBikeSummary(draft, separator);
  const fullName = draft.fullName ?? '';
  const firstName = fullName.split(/\s+/)[0] ?? '';

  const handleLine = [draft.username ? t('usernameHandle', { username: draft.username }) : undefined, draft.city]
    .filter(Boolean)
    .join(separator);

  const tags = [
    ...draft.roadPreferences.map((road) => t(`complete.roadTags.${road}`)),
    ...(draft.tempo ? [t('complete.tempoTag', { tempo: t(`tempo.${draft.tempo}`) })] : []),
  ];

  const handleStart = async () => {
    setSubmitting(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // The answer (or a failure) does not block finishing registration.
    }
    try {
      await completeProfile();
      // On success the guard unmounts the flow, so the loading state is left as is.
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <RegistrationStepScreen
      step={REGISTRATION_STEP_COUNT}
      heading={t(bike ? 'complete.heading' : 'complete.headingNoBike', { name: firstName })}
      description={t('complete.description')}
      ctaLabel={t('complete.start')}
      onCtaPress={handleStart}
      ctaLoading={submitting}>
      <GarageSummaryCard
        bike={bike}
        mainBikeLabel={t('complete.mainBike')}
        name={fullName}
        handleLine={handleLine}
        photoUri={draft.photoUri}
        ridingStyleLabel={t('complete.ridingStyleLabel')}
        tags={tags}
      />
      <InfoNote tone="accent" title={t('complete.nextStepTitle')} text={t('complete.nextStepText')} />
    </RegistrationStepScreen>
  );
}

/** Bike band content: "Yamaha MT-07" and "2022 · 689 cc · Naked"; undefined when the bike was skipped. */
function useBikeSummary(draft: RegistrationDraft, separator: string): GarageSummaryBike | undefined {
  const { t } = useTranslation(['registration', 'common', 'garage']);
  const brandName = draft.brand ? motorcycleBrandNames[draft.brand] : draft.customBrandName;
  if (!brandName) return undefined;

  const model = findModel(draft.modelId);
  const modelName = model?.name ?? draft.customModelName;
  const detail = [
    draft.modelYear !== undefined ? String(draft.modelYear) : undefined,
    model ? t('common:units.cc', { value: formatNumber(model.displacementCc) }) : undefined,
    model ? t(`garage:categories.${model.category}`) : undefined,
  ]
    .filter(Boolean)
    .join(separator);

  return {
    brand: draft.brand,
    brandName,
    title: modelName ? t('complete.bikeTitle', { brand: brandName, model: modelName }) : brandName,
    detail: detail || undefined,
  };
}
