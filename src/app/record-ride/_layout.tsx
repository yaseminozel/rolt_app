import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * 08.x Kayıt as a sheet over the tabs (Pencil `w90Kk` "Record sheet"): the record screen, the
 * lean calibration it may open first (08.00) and the background permission sheet (06.04).
 */
export default function RecordRideLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="calibrate" />
      {/* 06.04, same sheet as before navigation: tall content, fixed detents. */}
      <Stack.Screen
        name="background-permission"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.92, 1],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
