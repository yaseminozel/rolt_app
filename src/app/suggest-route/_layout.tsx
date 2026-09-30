import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { RouteSuggestionProvider } from '@/features/route-suggestion/RouteSuggestionProvider';
import { colors, fontFamily } from '@/theme';

/**
 * "Rota öner" flow (04.1–04.6). Native header titled "Rota öner"; the full-screen map steps
 * (search, pick on map, edit on map) draw their own top bars; sending has no way back.
 */
export default function SuggestRouteLayout() {
  const { t } = useTranslation('routeSuggestion');

  return (
    <RouteSuggestionProvider>
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
        <Stack.Screen name="index" />
        <Stack.Screen name="search" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="pick-on-map" options={{ headerShown: false }} />
        <Stack.Screen name="edit-on-map" options={{ headerShown: false }} />
        <Stack.Screen name="details" />
        <Stack.Screen
          name="add-photos"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen name="preview" />
        <Stack.Screen name="sending" options={{ headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="success" options={{ headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="failed" options={{ headerBackVisible: false, gestureEnabled: false }} />
      </Stack>
    </RouteSuggestionProvider>
  );
}
