import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Discover tab stack. Home draws its own header (01.5); "Önerilen Rotalar" (01.4) uses the
 * native header with a search bar; sort and location pickers are native form sheets.
 */
export default function DiscoverLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="recommended" />
      <Stack.Screen
        name="sort"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
        }}
      />
      <Stack.Screen
        name="location"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetAllowedDetents: [0.6, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
        }}
      />
    </Stack>
  );
}
