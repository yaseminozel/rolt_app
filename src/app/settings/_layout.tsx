import { Stack } from 'expo-router';

import { colors, fontFamily } from '@/theme';

/** 10.x Ayarlar: a modal stack; the menu (10.01) closes it with ×, sub pages push inside it. */
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: fontFamily.medium,
          fontSize: 18,
          color: colors.textPrimary,
        },
        contentStyle: { backgroundColor: colors.surface },
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
