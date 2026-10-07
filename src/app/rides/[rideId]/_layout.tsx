import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** A recorded ride: save form (08.05) and its sheets; detail and edit come with 09.06–09.07. */
export default function RideLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="save" />
    </Stack>
  );
}
