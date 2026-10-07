import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { motorcycleBrandNames } from '@/components/brand/MotorcycleBrandLogo';
import { OptionSheetList } from '@/components/registration/OptionSheetList';
import { BrandRow } from '@/components/settings/BrandRow';
import { REGISTRATION_BRANDS } from '@/features/registration/garageOptions';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import { matchesSearch } from '@/lib/searchText';

/**
 * 04.04 Kayıt tamamlama / Marka seç — Pencil `M3llIj`, a form sheet over 04.03. Picking a
 * brand clears a model and year chosen for another brand and closes the sheet.
 */
export default function BikeBrandSheet() {
  const { t } = useTranslation('registration');
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();
  const [query, setQuery] = useState('');

  const brands = useMemo(
    () => REGISTRATION_BRANDS.filter((brand) => matchesSearch(motorcycleBrandNames[brand], query)),
    [query],
  );

  return (
    <OptionSheetList
      title={t('bike.brand')}
      onClose={() => router.back()}
      search={{ value: query, onChangeText: setQuery, placeholder: t('bike.brandSearch') }}
      data={brands}
      keyExtractor={(brand) => brand}
      renderItem={(brand) => (
        <BrandRow
          brand={brand}
          label={motorcycleBrandNames[brand]}
          onPress={() => {
            if (brand !== draft.brand) {
              updateDraft({ brand, modelId: undefined, modelYear: undefined });
            }
            router.back();
          }}
        />
      )}
    />
  );
}
