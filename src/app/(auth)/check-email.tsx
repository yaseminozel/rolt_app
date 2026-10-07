import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { ResendEmailForm } from '@/components/auth/ResendEmailForm';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam, maskEmail } from '@/features/auth/credentials';

/** 02.04 Auth / E-posta kontrol — Pencil `U9gRlP`. Back returns to 02.03 to change the address. */
export default function CheckEmailScreen() {
  const { t } = useTranslation('auth');
  const { service } = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = firstParam(params.email);
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthScreen
      title={t('checkEmail.title')}
      subtitle={t('checkEmail.subtitle', { email: maskEmail(email) })}
      errorMessage={error}>
      <ResendEmailForm
        email={email}
        onResend={() => service.requestPasswordReset(email)}
        onError={setError}
      />
    </AuthScreen>
  );
}
