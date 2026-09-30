import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.textPrimary,
      }}>
      <Stack.Screen name="terms" options={{ title: 'Kullanım Koşulları' }} />
      <Stack.Screen name="privacy" options={{ title: 'Gizlilik Politikası' }} />
    </Stack>
  );
}
