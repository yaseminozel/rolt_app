import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { usePermissionPromptSheet } from '@/features/auth/usePermissionPromptSheet';
import { RegistrationDraftProvider } from '@/features/registration/RegistrationDraftProvider';
import { colors } from '@/theme';

/** Option sheets of the bike step (04.04 Marka, 04.05 Model, 04.06 Yıl). */
const optionSheet = (initialDetent: number): ComponentProps<typeof Stack.Screen>['options'] => ({
  presentation: 'formSheet',
  headerShown: false,
  sheetAllowedDetents: [initialDetent, 1],
  sheetInitialDetentIndex: 0,
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
});

/**
 * Registration ("Kayıt tamamlama", 04.01–04.07): profile → location → bike → loading, under a
 * native header with only a back button ("Üst çubuk / Profil" has no title). A new account
 * first gets the permission sheet (03.01–03.02) over its first step.
 */
export default function RegisterLayout() {
  usePermissionPromptSheet();

  return (
    <RegistrationDraftProvider>
      <Stack
        screenOptions={{
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          contentStyle: { backgroundColor: colors.surface },
        }}>
        <Stack.Screen name="profile" />
        <Stack.Screen name="location" />
        <Stack.Screen name="bike" />
        {/* Sheet heights follow the frames: 650, 617 and 557 of 852 pt. */}
        <Stack.Screen name="bike-brand" options={optionSheet(0.76)} />
        <Stack.Screen name="bike-model" options={optionSheet(0.72)} />
        <Stack.Screen name="bike-year" options={optionSheet(0.65)} />
        <Stack.Screen name="loading" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </RegistrationDraftProvider>
  );
}
