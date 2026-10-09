import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { ownProfileRepository } from '@/features/profile/ownProfileRepository';
import { ownProfileKeys } from '@/features/profile/queries';
import { UsernameTakenError } from '@/features/profile/types';
import { useRegistrationDraft } from '@/features/registration/RegistrationDraftProvider';
import { colors, spacing, typography } from '@/theme';

/**
 * 04.07 Kayıt tamamlama / Yükleniyor — Pencil `wHiDB`. Saves the profile; once it is done the
 * root guard opens the app. No back (replace-navigated, gesture off). If saving fails the
 * user lands back on the bike step to try again; a username taken in the meantime goes back to
 * the profile step, whose field then reads "kullanımda" with suggestions.
 */
export default function RegisterLoadingScreen() {
  const { t } = useTranslation('registration');
  const router = useRouter();
  const { completeProfile, session } = useAuth();
  const { draft } = useRegistrationDraft();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) {
      return;
    }
    // The profile (09.01) is built from the registration steps, then the account is completed.
    ownProfileRepository
      .saveFromRegistration(session, draft)
      .then((profile) => queryClient.setQueryData(ownProfileKeys.detail(profile.userId), profile))
      .then(() => completeProfile())
      .catch((error: unknown) => {
        if (error instanceof UsernameTakenError) {
          // A fresh profile step re-checks the drafted username (the one below kept "available").
          router.dismissAll();
          router.replace('/register/profile');
          return;
        }
        router.replace('/register/bike');
      });
    // Runs once when the screen opens; the draft is final by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
