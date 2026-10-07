import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceSheet } from '@/components/settings/ChoiceSheet';
import type { AppLanguage } from '@/i18n/language';
import { applyLanguage } from '@/features/settings/appPreferences';

/** 10.10 Dil (Pencil `fh2JX`): Türkçe / English, applied on "Kaydet". */
export default function LanguageSheet() {
  const { t, i18n } = useTranslation('settings');
  const [choice, setChoice] = useState<AppLanguage>(i18n.language === 'en' ? 'en' : 'tr');

  return (
    <ChoiceSheet
      title={t('languageSheet.title')}
      subtitle={t('languageSheet.subtitle')}
      options={[
        { value: 'tr', label: t('values.language.tr'), description: t('languageSheet.trHint') },
        { value: 'en', label: t('values.language.en'), description: t('languageSheet.enHint') },
      ]}
      value={choice}
      onChange={setChoice}
      saveLabel={t('languageSheet.save')}
      onSave={async () => {
        await applyLanguage(choice);
        router.back();
      }}
    />
  );
}
