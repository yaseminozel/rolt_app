import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { ResendEmailForm } from '@/components/auth/ResendEmailForm';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * 02.07 Auth / E-posta doğrulama — Yeni hesap (Pencil `qsvDD`). Waits for the link in the
 * verification email: opening it lands on `confirm`, and coming back to the app re-reads the
 * account in case it was opened elsewhere. Once verified the root guard moves on.
 */
export default function EmailVerificationScreen() {
  const { t } = useTranslation('auth');
  const { session, service, refreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const email = session?.email ?? '';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshSession();
      }
    });
    return () => subscription.remove();
  }, [refreshSession]);

  return (
    <AuthScreen
      title={t('emailVerification.title')}
      subtitle={t('emailVerification.subtitle')}
      errorMessage={error}>
      <ResendEmailForm
        email={email}
        onResend={() => service.requestEmailVerification(email)}
        onError={setError}
      />
    </AuthScreen>
  );
}
