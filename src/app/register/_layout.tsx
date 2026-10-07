import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { usePermissionPromptSheet } from '@/features/auth/usePermissionPromptSheet';
import { RegistrationDraftProvider } from '@/features/registration/RegistrationDraftProvider';
import { colors, fontFamily } from '@/theme';

/**
 * Registration flow with a native header titled "Hesap oluştur" (`registration:title`).
 * A new account first gets the permission sheet (03.01–03.02) over its first step.
 */
export default function RegisterLayout() {
  const { t } = useTranslation('registration');
  usePermissionPromptSheet();

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
        <Stack.Screen
          name="city"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            // Opens at 60% like the design's option sheets; drag up to full height while searching.
            sheetAllowedDetents: [0.6, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
      </Stack>
    </RegistrationDraftProvider>
  );
}
