import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors, fontFamily } from '@/theme';

type ScreenOptions = ComponentProps<typeof Stack.Screen>['options'];

const sheet: ScreenOptions = {
  presentation: 'formSheet',
  headerShown: false,
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
};

/**
 * 10.x Ayarlar: a modal stack; the menu (10.01) closes it with ×, sub pages push inside it and
 * the single choices / permission details are form sheets over it.
 */
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontFamily: fontFamily.semibold,
          fontSize: 18,
          color: colors.textPrimary,
        },
        contentStyle: { backgroundColor: colors.surface },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="ride-visibility" options={sheet} />
      <Stack.Screen name="language" options={sheet} />
      <Stack.Screen name="units" options={sheet} />
      <Stack.Screen name="location" options={sheet} />
      <Stack.Screen name="photos" options={sheet} />
      {/* 11.02–11.05: one sheet stepping brand → model → year → summary. */}
      <Stack.Screen
        name="garage-add"
        options={{ ...sheet, sheetAllowedDetents: [0.76, 1] }}
      />
    </Stack>
  );
}
