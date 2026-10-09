import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Akış 22 Topluluk: feed, full-screen search and the comments sheet. */
export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade' }} />
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
