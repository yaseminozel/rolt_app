import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** The rider profile (13.03) is opened directly; the comments sheet always sits on top of it. */
export const unstable_settings = { initialRouteName: 'index' };

/**
 * Another rider's profile (13.03) and the comments sheet of their rides (13.02), which opens over
 * the profile instead of jumping to the Topluluk tab.
 */
export default function RiderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="comments"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.7, 1],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
