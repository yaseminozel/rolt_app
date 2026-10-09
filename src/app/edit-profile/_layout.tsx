import { Stack } from 'expo-router';

import { colors, fontFamily } from '@/theme';

/** 09.05 Profili düzenle: the form with a native header, and the city picker as a form sheet. */
export default function EditProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTitleStyle: { fontFamily: fontFamily.semibold, fontSize: 18, color: colors.textPrimary },
        contentStyle: { backgroundColor: colors.surface },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="city"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetAllowedDetents: [0.6, 1],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
