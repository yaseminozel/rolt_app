import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CityPickerList } from '@/components/location/CityPickerList';
import { useDiscoverState } from '@/features/discover/DiscoverStateProvider';

/**
 * Discover region picker ("Konumun: Antalya, Türkiye" → form sheet). No dedicated frame:
 * reuses the registration city picker. The choice wins over the device location.
 */
export default function DiscoverLocationScreen() {
  const { t } = useTranslation('discover');
  const router = useRouter();
  const { city, selectCity } = useDiscoverState();

  return (
    <CityPickerList
      title={t('location.title')}
      searchPlaceholder={t('location.searchPlaceholder')}
      noResultsText={t('location.noResults')}
      selectedCity={city}
      onSelect={(name) => {
        selectCity(name);
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
