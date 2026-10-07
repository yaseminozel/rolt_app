import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { colors, spacing, typography } from '@/theme';

/**
 * 04.07 Kayıt tamamlama / Yükleniyor — Pencil `wHiDB`. Saves the profile; once it is done the
 * root guard opens the app. No back (replace-navigated, gesture off). If saving fails the
 * user lands back on the bike step to try again.
 */
export default function RegisterLoadingScreen() {
  const { t } = useTranslation('registration');
  const router = useRouter();
  const { completeProfile } = useAuth();

  useEffect(() => {
    completeProfile().catch(() => router.replace('/register/bike'));
  }, [completeProfile, router]);

  return (
    <View style={styles.screen} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.label}>{t('loading')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
});
