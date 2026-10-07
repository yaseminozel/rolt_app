import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { LinkExpiredIllustration } from '@/components/auth/LinkExpiredIllustration';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { VERIFICATION_LINK_VALIDITY_HOURS } from '@/features/auth/credentials';
import { spacing } from '@/theme';

/**
 * 02.07 Auth / E-posta doğrulama — Süresi dolmuş bağlantı (Pencil `HrHxU`). Opened from an
 * expired or invalid verification link. "Yeni bağlantı gönder" sends a fresh link and returns
 * to the waiting screen; "Giriş ekranına dön" signs out of the unverified account.
 */
export default function VerificationLinkExpiredScreen() {
  const { t } = useTranslation('auth');
  const { session, service, signOut } = useAuth();
  const [pending, setPending] = useState<'resend' | 'signOut' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const email = session?.email ?? '';

  const handleResend = async () => {
    if (pending) {
      return;
    }
    setError(null);
    setPending('resend');
    try {
      await service.requestEmailVerification(email);
      router.replace('/email-verification');
    } catch {
      setError(t('errors.network'));
      setPending(null);
    }
  };

  const handleBackToSignIn = async () => {
    if (pending) {
      return;
    }
    setPending('signOut');
    try {
      // The root guards switch back to the signed-out flow.
      await signOut();
    } catch {
      setError(t('errors.network'));
      setPending(null);
    }
  };

  return (
    <AuthScreen
      illustration={<LinkExpiredIllustration />}
      title={t('linkExpired.title')}
      subtitle={t('emailVerification.expiredSubtitle', { count: VERIFICATION_LINK_VALIDITY_HOURS })}
      errorMessage={error}>
      <View style={styles.group}>
        <TextField label={t('fields.email')} value={email} onChangeText={noop} disabled />
        <Button
          label={t('linkExpired.resend')}
          loading={pending === 'resend'}
          disabled={!email}
          onPress={handleResend}
        />
        <Button
          variant="text"
          label={t('linkExpired.backToSignIn')}
          loading={pending === 'signOut'}
          onPress={handleBackToSignIn}
        />
      </View>
    </AuthScreen>
  );
}

const noop = () => {};

const styles = StyleSheet.create({
  group: {
    gap: spacing.lg,
  },
});
