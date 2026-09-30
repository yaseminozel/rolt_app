import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';

export default function LegalLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.textPrimary,
      }}>
      <Stack.Screen name="terms" options={{ title: t('legal.terms') }} />
      <Stack.Screen name="privacy" options={{ title: t('legal.privacy') }} />
    </Stack>
  );
}
