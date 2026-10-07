import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LegalDocument } from '@/components/settings/LegalDocument';

/** 10.14 Gizlilik politikası inside the settings stack. */
export default function SettingsPrivacyScreen() {
  const { t } = useTranslation('settings');
  return (
    <>
      <Stack.Screen options={{ title: t('items.privacyPolicy') }} />
      <LegalDocument document="privacy" />
    </>
  );
}
