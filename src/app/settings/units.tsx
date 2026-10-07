import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceSheet } from '@/components/settings/ChoiceSheet';
import { applyUnitSystem } from '@/features/settings/appPreferences';
import { getUnitSystem, type UnitSystem } from '@/i18n/units';

/** 10.11 Ölçü birimleri (Pencil `cwNgO`): Metrik / Imperial, applied on "Kaydet". */
export default function UnitsSheet() {
  const { t } = useTranslation('settings');
  const [choice, setChoice] = useState<UnitSystem>(getUnitSystem);

  return (
    <ChoiceSheet
      title={t('unitsSheet.title')}
      subtitle={t('unitsSheet.subtitle')}
      options={[
        { value: 'metric', label: t('unitsSheet.metric'), description: t('unitsSheet.metricHint') },
        {
          value: 'imperial',
          label: t('unitsSheet.imperial'),
          description: t('unitsSheet.imperialHint'),
        },
      ]}
      value={choice}
      onChange={setChoice}
      saveLabel={t('unitsSheet.save')}
      onSave={async () => {
        await applyUnitSystem(choice);
        router.back();
      }}
    />
  );
}
