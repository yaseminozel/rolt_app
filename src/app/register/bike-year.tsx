import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OptionRow } from '@/components/registration/OptionRow';
import { OptionSheetList } from '@/components/registration/OptionSheetList';
import { findModel } from '@/features/garage/fixtures/motorcycleModels';
import { modelYears } from '@/features/registration/garageOptions';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';

/** 04.06 Kayıt tamamlama / Yıl seç — Pencil `su2g3`: model years under the model name, newest first. */
export default function BikeYearSheet() {
  const { t, i18n } = useTranslation('registration');
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [years] = useState(() => modelYears());
  const model = findModel(draft.modelId);

  if (!model) {
    return <Redirect href="/register/bike" />;
  }

  return (
    <OptionSheetList
      title={t('bike.year')}
      onClose={() => router.back()}
      sectionTitle={model.name.toLocaleUpperCase(i18n.language)}
      data={years}
      keyExtractor={String}
      renderItem={(year) => (
        <OptionRow
          label={String(year)}
          onPress={() => {
            updateDraft({ modelYear: year });
            router.back();
          }}
        />
      )}
    />
  );
}
