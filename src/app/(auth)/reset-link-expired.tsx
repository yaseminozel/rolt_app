import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { LinkExpiredIllustration } from '@/components/auth/LinkExpiredIllustration';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam, RESET_LINK_VALIDITY_MINUTES } from '@/features/auth/credentials';
import { spacing } from '@/theme';

/**
 * Password reset link expired — laid out like 02.07 "Süresi dolmuş bağlantı" (Pencil `HrHxU`),
 * the design's only expired-link screen, with the reset link's own validity. Replaces 02.05
 * "Yeni şifre" when the link is expired (param `email`) or invalid (no email: the field is
 * hidden and a new link starts from 02.03 so the address can be entered). No back button.
 */
export default function ResetLinkExpiredScreen() {
  const { t } = useTranslation('auth');
  const { service } = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = firstParam(params.email);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (sending) {
      return;
    }
    if (!email) {
      router.replace('/sign-in');
      router.push('/forgot-password');
      return;
    }
    setError(null);
    setSending(true);
    try {
      await service.requestPasswordReset(email);
      // Rebuild the reset flow under 02.04 so going back still reaches 02.03.
      router.replace('/sign-in');
      router.push({ pathname: '/forgot-password', params: { email } });
      router.push({ pathname: '/check-email', params: { email } });
    } catch {
      setError(t('errors.network'));
      setSending(false);
    }
  };

  const handleBackToSignIn = () => {
    if (!sending) {
      router.replace('/sign-in');
    }
  };

  return (
    <AuthScreen
      illustration={<LinkExpiredIllustration />}
      title={t('linkExpired.title')}
      subtitle={t('resetLinkExpired.subtitle', { minutes: RESET_LINK_VALIDITY_MINUTES })}
      errorMessage={error}>
      <View style={styles.group}>
        {email ? (
          <TextField label={t('fields.email')} value={email} onChangeText={noop} disabled />
        ) : null}
        <Button label={t('linkExpired.resend')} loading={sending} onPress={handleResend} />
        <Button
          variant="text"
          label={t('linkExpired.backToSignIn')}
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
