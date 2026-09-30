import { Stack } from 'expo-router';

/** Permission priming after registration: 00.13 location → 00.14 notifications → app. */
export default function PermissionsLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
