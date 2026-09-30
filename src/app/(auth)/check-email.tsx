import { startActivityAsync } from 'expo-intent-launcher';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { formatCountdown, useCountdown } from '@/components/auth/useCountdown';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam, maskEmail } from '@/features/auth/credentials';
import { colors, spacing, typography } from '@/theme';

const RESEND_COOLDOWN_SECONDS = 60;
/** Android `Intent.FLAG_ACTIVITY_NEW_TASK`. */
const FLAG_ACTIVITY_NEW_TASK = 268435456;

/** Opens the default mail app's inbox; does nothing when no app can handle it. */
function openMailApp() {
  if (Platform.OS === 'ios') {
    Linking.openURL('message://').catch(() => {});
    return;
  }
  if (Platform.OS === 'android') {
    // Resolves only when the user returns to the app, so it isn't awaited.
    startActivityAsync('android.intent.action.MAIN', {
      category: 'android.intent.category.APP_EMAIL',
      flags: FLAG_ACTIVITY_NEW_TASK,
    }).catch(() => {});
  }
}

/** 00.5 Auth / E-posta Kontrol — Pencil `AQCUg`. */
export default function CheckEmailScreen() {
  const { t } = useTranslation('auth');
  const { service } = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = firstParam(params.email);
  const { remaining, restart } = useCountdown(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counting = remaining > 0;

  const handleResend = async () => {
    if (counting || resending || !email) {
      return;
    }
    setError(null);
    setResending(true);
    try {
      await service.requestPasswordReset(email);
      restart();
    } catch {
      setError(t('errors.network'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreen
      title={t('checkEmail.title')}
      subtitle={t('checkEmail.subtitle', { email: maskEmail(email) })}
      errorMessage={error}>
      <View style={styles.group}>
        <View style={styles.actions}>
          <Button label={t('checkEmail.openMail')} onPress={openMailApp} />
          <Button
            variant="outlined"
            label={
              counting
                ? t('checkEmail.resendCountdown', { time: formatCountdown(remaining) })
                : t('checkEmail.resend')
            }
            accessibilityLabel={
              counting
                ? t('checkEmail.resendCountdownA11y', { seconds: remaining })
                : undefined
            }
            disabled={counting || !email}
            loading={resending}
            onPress={handleResend}
          />
          <Button variant="text" label={t('checkEmail.changeEmail')} onPress={() => router.back()} />
        </View>
        <Text style={styles.tip}>{t('checkEmail.tip')}</Text>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
  tip: {
    ...typography.captionRelaxed,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
