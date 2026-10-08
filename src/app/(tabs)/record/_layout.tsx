import { Stack } from 'expo-router';

export default function RecordLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/* 06.04, same sheet as before navigation: tall content, fixed detents. */}
      <Stack.Screen
        name="background-permission"
        options={{
          headerShown: false,
          presentation: 'formSheet',
          sheetAllowedDetents: [0.92, 1],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
