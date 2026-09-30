import { Stack } from 'expo-router';

import { DiscoverStateProvider } from '@/features/discover/DiscoverStateProvider';
import { colors } from '@/theme';

/**
 * Discover tab stack. Home draws its own header (01.5); "Önerilen Rotalar" (01.4) uses the
 * native header with a search bar; sort, filter and region pickers are native form sheets.
 * `DiscoverStateProvider` keeps region, chips, search, sort and filters for all of them.
 */
export default function DiscoverLayout() {
  return (
    <DiscoverStateProvider>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.surface },
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
          name="filter"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            // The whole sheet (622 pt in PXcQ0) fits on every supported iPhone, footer included.
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
    </DiscoverStateProvider>
  );
}
