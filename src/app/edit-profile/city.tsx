import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CityPickerList } from '@/components/location/CityPickerList';
import { editProfileCity, usePickedCity } from '@/features/profile/EditProfileDraft';

/** 09.05 "Konum": the registration city picker; the choice goes back to the form. */
export default function EditProfileCityScreen() {
  const { t } = useTranslation('profile');
  const picked = usePickedCity();

  return (
    <CityPickerList
      title={t('edit.cityTitle')}
      searchPlaceholder={t('edit.citySearch')}
      noResultsText={t('edit.cityNoResults')}
      selectedCity={picked ?? undefined}
      onSelect={(name) => {
        editProfileCity.set(name);
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
