import { Stack } from 'expo-router';

export default function DiscoverLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
