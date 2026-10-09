import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** 09.01 Profil, and the comments sheet of the viewer's uploaded rides (13.02). */
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="comments"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetAllowedDetents: [0.7, 1],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
