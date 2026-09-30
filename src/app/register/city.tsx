import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CityPickerList } from '@/components/location/CityPickerList';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';

/**
 * City picker for 00.8 "Şehir", presented as a native form sheet (detents 60 % / 100 %,
 * grabber and radius come from `register/_layout.tsx`). Picking a city saves it and closes.
 */
export default function CityPickerScreen() {
  const { t } = useTranslation('registration');
  const router = useRouter();
  const { draft, updateDraft } = useRegistrationDraft();

  return (
    <CityPickerList
      title={t('city.title')}
      searchPlaceholder={t('city.searchPlaceholder')}
      noResultsText={t('city.noResults')}
      selectedCity={draft.city}
      onSelect={(name) => {
        updateDraft({ city: name });
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
