import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Auth flow (00.1–00.7). Screens draw the ROLT wordmark as their own header.
 * Steps that follow sign-in get a transparent native header with only a back button (the design
 * shows a back chevron on them); the reset flow's end screens have no back.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="password" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="check-email" />
      <Stack.Screen name="reset-password" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="password-updated" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="account-locked" />
      <Stack.Screen name="linked-account" />
      <Stack.Screen name="reset-link-expired" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
