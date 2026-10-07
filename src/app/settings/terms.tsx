import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LegalDocument } from '@/components/settings/LegalDocument';

/** 10.15 Kullanım koşulları inside the settings stack. */
export default function SettingsTermsScreen() {
  const { t } = useTranslation('settings');
  return (
    <>
      <Stack.Screen options={{ title: t('items.terms') }} />
      <LegalDocument document="terms" />
    </>
  );
}
