import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import '@/i18n';
import { appFonts, colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.textPrimary,
    background: colors.surface,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={navigationTheme}>
        <RootNavigator />
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}

/**
 * Route access by auth state:
 * - (tabs): signed in with a finished profile, or guest ("Hesap oluşturmadan keşfet")
 * - register: signed in, registration (00.8–00.12) not finished
 * - permissions: registration just finished, permission screens (00.13–00.14) pending
 * - sign-in-prompt: guest hit an account-only action (00.15)
 * - onboarding + (auth): signed out
 * `index` resolves the right entry point whenever a guard flips.
 */
function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const { isReady, canUseApp, needsProfile, needsPermissionPrompts, session, isGuest } = useAuth();
  const ready = (fontsLoaded || fontError !== null) && isReady;
  const signedOut = session === null && !isGuest;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={canUseApp && !needsPermissionPrompts}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={isGuest}>
        <Stack.Screen
          name="sign-in-prompt"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={needsPermissionPrompts}>
        <Stack.Screen name="permissions" />
      </Stack.Protected>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={signedOut}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="legal" />
    </Stack>
  );
}
