import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { LogBox, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/feedback/ToastProvider';
import { MapExpandProvider } from '@/components/map/MapExpandTransition';
// Defines the background navigation location task at launch (it must exist before any update arrives).
import '@/features/navigation/location/backgroundLocationTask';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { takePendingAccountAction } from '@/features/auth/pendingAccountAction';
import { RideRecordingProvider } from '@/features/rides/RideRecordingProvider';
import { SavedRoutesProvider } from '@/features/routes/SavedRoutesProvider';
import '@/i18n';
import { appFonts, colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Web preview only: react-native-web renders nested Pressables as nested <button>s, which React
// DOM warns about. Native builds are unaffected, so these dev warnings are hidden on web.
if (__DEV__ && Platform.OS === 'web') {
  LogBox.ignoreLogs([
    'cannot contain a nested',
    'cannot be a descendant of',
    'for a non-boolean attribute',
  ]);
}

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
  const [queryClient] = useState(() => new QueryClient());

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SavedRoutesProvider>
            <RideRecordingProvider>
              <ThemeProvider value={navigationTheme}>
                <BottomSheetModalProvider>
                  <ToastProvider>
                    <MapExpandProvider>
                      <RootNavigator />
                    </MapExpandProvider>
                    <StatusBar style="dark" />
                  </ToastProvider>
                </BottomSheetModalProvider>
              </ThemeProvider>
            </RideRecordingProvider>
          </SavedRoutesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Route access by auth state:
 * - (tabs): signed in, verified, with a finished profile, or guest ("Hesap oluşturmadan keşfet")
 * - email-verification: new email account whose verification link isn't opened yet (02.07)
 * - register: signed in and verified, registration (04.x) not finished
 * - permissions: form sheet (03.01–03.02) owed by a new account, presented over registration
 * - sign-in-prompt: guest hit an account-only action
 * - onboarding + (auth): signed out
 * `index` resolves the right entry point whenever a guard flips.
 */
function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const {
    isReady,
    canUseApp,
    needsEmailVerification,
    needsProfile,
    needsPermissionPrompts,
    session,
    isGuest,
  } = useAuth();
  const ready = (fontsLoaded || fontError !== null) && isReady;
  const signedOut = session === null && !isGuest;
  const signedInToApp = canUseApp && session !== null && !needsPermissionPrompts;

  // Replays the action a guest tried before signing in (e.g. saving a route), once they are in the app.
  useEffect(() => {
    if (signedInToApp) {
      takePendingAccountAction()?.();
    }
  }, [signedInToApp]);

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
      <Stack.Protected guard={canUseApp}>
        <Stack.Screen name="(tabs)" />
        {/* Full-screen map surfaces without the tab bar (01.6, 01.7). */}
        <Stack.Screen name="route/[id]" />
        {/* 07.01 opens from Discover's map card growing into it (MapExpandTransition): no push
            animation of its own, and no edge swipe (the map takes the pans; back shrinks it). */}
        <Stack.Screen name="explore" options={{ animation: 'none', gestureEnabled: false }} />
        {/* Another rider's profile (01.8): opened from the route detail, draws its own top bar. */}
        <Stack.Screen name="rider/[id]" />
        <Stack.Screen
          name="ride-together/[id]"
          options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', title: '' }}
        />
        <Stack.Screen name="suggest-route" />
        {/* "Rotayı sür" (06.x): its own stack of map screens and sheets. */}
        <Stack.Screen name="ride/[routeId]" options={{ gestureEnabled: false }} />
        {/* A recorded ride (08.05–08.11, 09.06–09.07): save form, detail, edit and their sheets. */}
        <Stack.Screen name="rides/[rideId]" />
        {/* 09.02 Profili paylaş: QR card over the dimmed profile. */}
        <Stack.Screen
          name="share-profile"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        {/* 09.03 Sürüşü paylaş: share templates as a native sheet. */}
        <Stack.Screen
          name="share-ride"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        {/* 09.05 Profili düzenle: own stack with a native header and the city sheet. */}
        <Stack.Screen name="edit-profile" />
        {/* 10.x Ayarlar: modal stack closed with × (sub pages push inside it). */}
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={isGuest}>
        <Stack.Screen
          name="sign-in-prompt"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={needsEmailVerification}>
        <Stack.Screen name="email-verification" />
      </Stack.Protected>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={needsPermissionPrompts}>
        <Stack.Screen
          name="permissions"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={signedOut}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="legal" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
