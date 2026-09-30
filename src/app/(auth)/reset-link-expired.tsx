import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { CautionNote } from '@/components/auth/CautionNote';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  firstParam,
  parseTimestampParam,
  RESET_LINK_VALIDITY_MINUTES,
} from '@/features/auth/credentials';
import { formatClockTime, formatDayMonth, turkishTimeLocativeSuffix } from '@/i18n/format';
import { spacing } from '@/theme';

/**
 * 00.6 Auth / Bağlantının süresi dolmuş — Pencil `b1m1YP`. Replaces 00.6 "Yeni Şifre" when the
 * reset link is expired (params: `email`, `sentAt` in epoch ms) or invalid (no params: the
 * send-time note is hidden and a new link starts from 00.4 so the email can be entered).
 * No back button; both actions leave the screen.
 */
export default function ResetLinkExpiredScreen() {
  const { t } = useTranslation('auth');
  const { service } = useAuth();
  const params = useLocalSearchParams<{
    email?: string | string[];
    sentAt?: string | string[];
  }>();
  const email = firstParam(params.email);
  const sentAt = parseTimestampParam(params.sentAt);
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
      // Rebuild the reset flow under 00.5 so "E-posta adresini değiştir" still has 00.4 behind it.
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
      title={t('resetLinkExpired.title')}
      subtitle={t('resetLinkExpired.subtitle', { minutes: RESET_LINK_VALIDITY_MINUTES })}
      errorMessage={error}>
      <View style={styles.content}>
        {sentAt ? (
          <CautionNote
            text={t('resetLinkExpired.sentAt', {
              date: formatDayMonth(sentAt),
              time: formatClockTime(sentAt),
              suffix: turkishTimeLocativeSuffix(sentAt),
            })}
          />
        ) : null}
        <View style={styles.actions}>
          <Button label={t('resetLinkExpired.resend')} loading={sending} onPress={handleResend} />
          <Button
            variant="text"
            label={t('resetLinkExpired.backToSignIn')}
            onPress={handleBackToSignIn}
          />
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
  },
  actions: {
    gap: spacing.lg,
  },
});
