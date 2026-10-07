import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { OptionRow } from '@/components/registration/OptionRow';
import { OptionSheetList } from '@/components/registration/OptionSheetList';
import { modelsForBrand } from '@/features/garage/fixtures/motorcycleModels';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import { formatNumber } from '@/i18n/format';
import { matchesSearch } from '@/lib/searchText';

/**
 * 04.05 Kayıt tamamlama / Model seç — Pencil `V4YviO`: the chosen brand's models under
 * "{MARKA} MODELLERİ" with their displacement. Picking one clears the year and closes.
 */
export default function BikeModelSheet() {
  const { t, i18n } = useTranslation('registration');
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [query, setQuery] = useState('');
  const brand = draft.brand;

  const models = useMemo(
    () => (brand ? modelsForBrand(brand).filter((model) => matchesSearch(model.name, query)) : []),
    [brand, query],
  );

  if (!brand) {
    return <Redirect href="/register/bike" />;
  }

  return (
    <OptionSheetList
      title={t('bike.model')}
      onClose={() => router.back()}
      search={{ value: query, onChangeText: setQuery, placeholder: t('bike.modelSearch') }}
      sectionTitle={t('bike.modelsOf', { brand: motorcycleBrandNames[brand] }).toLocaleUpperCase(
        i18n.language,
      )}
      data={models}
      keyExtractor={(model) => model.id}
      renderItem={(model) => (
        <OptionRow
          label={model.name}
          value={t('bike.displacement', { cc: formatNumber(model.displacementCc) })}
          onPress={() => {
            if (model.id !== draft.modelId) {
              updateDraft({ modelId: model.id, modelYear: undefined });
            }
            router.back();
          }}
        />
      )}
    />
  );
}
