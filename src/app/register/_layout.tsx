import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RegistrationDraftProvider } from '@/features/registration/RegistrationDraftProvider';
import { colors, fontFamily } from '@/theme';

/** Registration flow 00.8–00.12 with a native header titled "Hesap oluştur" (`registration:title`). */
export default function RegisterLayout() {
  const { t } = useTranslation('registration');

  return (
    <RegistrationDraftProvider>
      <Stack
        screenOptions={{
          headerTitle: t('title'),
          headerTitleAlign: 'left',
          headerTitleStyle: { fontFamily: fontFamily.medium, fontSize: 18, color: colors.textPrimary },
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.surface },
        }}>
        <Stack.Screen name="profile" />
        <Stack.Screen name="brand" />
        <Stack.Screen name="model" />
        <Stack.Screen name="riding-style" />
        <Stack.Screen name="complete" options={{ headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="city" options={{ presentation: 'formSheet', headerShown: false }} />
      </Stack>
    </RegistrationDraftProvider>
  );
}
