import { Stack } from 'expo-router';

import { RegistrationDraftProvider } from '@/features/registration/RegistrationDraftProvider';
import { colors, fontFamily } from '@/theme';

/** Registration flow 00.8–00.12 with a native header titled "Hesap oluştur". */
export default function RegisterLayout() {
  return (
    <RegistrationDraftProvider>
      <Stack
        screenOptions={{
          headerTitle: 'Hesap oluştur',
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
