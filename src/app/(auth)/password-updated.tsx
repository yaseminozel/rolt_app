import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';

/** 00.7 Auth / Şifre Güncellendi — Pencil `rPpnG`. End of the reset flow; no back button. */
export default function PasswordUpdatedScreen() {
  const { t } = useTranslation('auth');

  return (
    <AuthScreen title={t('passwordUpdated.title')} subtitle={t('passwordUpdated.subtitle')}>
      <Button label={t('passwordUpdated.submit')} onPress={() => router.replace('/sign-in')} />
    </AuthScreen>
  );
}
