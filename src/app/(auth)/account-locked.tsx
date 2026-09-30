import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { LockStatusCard } from '@/components/auth/LockStatusCard';
import { formatClockCountdown, useCountdownUntil } from '@/components/auth/useCountdown';
import { Button } from '@/components/ui/Button';
import { firstParam, parseTimestampParam } from '@/features/auth/credentials';
import { spacing } from '@/theme';

/**
 * 00.3 Auth / Hesap geçici olarak kilitlendi — Pencil `GFGB4`. Replaces the password step
 * after the last failed attempt (params: `email`, `lockedUntil` in epoch ms), so back and
 * "Farklı bir hesapla giriş yap" both return to sign-in.
 */
export default function AccountLockedScreen() {
  const params = useLocalSearchParams<{
    email?: string | string[];
    lockedUntil?: string | string[];
  }>();
  const email = firstParam(params.email);
  const lockedUntil = parseTimestampParam(params.lockedUntil);

  if (!email || !lockedUntil) {
    return <Redirect href="/sign-in" />;
  }
  return <AccountLocked email={email} lockedUntil={lockedUntil} />;
}

type AccountLockedProps = {
  email: string;
  lockedUntil: Date;
};

function AccountLocked({ email, lockedUntil }: AccountLockedProps) {
  const { t } = useTranslation('auth');
  const remaining = useCountdownUntil(lockedUntil);
  const unlocked = remaining === 0;
  const wasLocked = useRef(!unlocked);

  // The ticking value is not a live region; announce once when the lock ends.
  useEffect(() => {
    if (unlocked && wasLocked.current) {
      wasLocked.current = false;
      AccessibilityInfo.announceForAccessibility(t('accountLocked.unlockedValue'));
    }
  }, [t, unlocked]);

  const handleTryAgain = () => {
    router.replace({ pathname: '/password', params: { email, mode: 'existing' } });
  };

  const handleResetPassword = () => {
    router.push({ pathname: '/forgot-password', params: { email } });
  };

  const handleDifferentAccount = () => {
    router.dismissTo('/sign-in');
  };

  return (
    <AuthScreen title={t('accountLocked.title')} subtitle={t('accountLocked.subtitle')}>
      <View style={styles.content}>
        {unlocked ? (
          <LockStatusCard
            status="unlocked"
            label={t('accountLocked.unlockedLabel')}
            value={t('accountLocked.unlockedValue')}
            accessibilityLabel={`${t('accountLocked.unlockedLabel')}. ${t('accountLocked.unlockedValue')}`}
          />
        ) : (
          <LockStatusCard
            status="locked"
            label={t('accountLocked.countdownLabel')}
            value={formatClockCountdown(remaining)}
            accessibilityLabel={t('accountLocked.countdownA11y', {
              count: Math.ceil(remaining / 60),
            })}
          />
        )}

        {/* Once the lock ends, retrying becomes the main action and reset steps back. */}
        <View style={styles.actions}>
          {unlocked ? (
            <>
              <Button label={t('accountLocked.tryAgain')} onPress={handleTryAgain} />
              <Button
                variant="text"
                label={t('accountLocked.resetPassword')}
                onPress={handleResetPassword}
              />
            </>
          ) : (
            <Button label={t('accountLocked.resetPassword')} onPress={handleResetPassword} />
          )}
          <Button
            variant="text"
            label={t('accountLocked.differentAccount')}
            onPress={handleDifferentAccount}
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
