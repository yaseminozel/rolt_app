import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam, MIN_PASSWORD_LENGTH } from '@/features/auth/credentials';
import { isAuthError } from '@/features/auth/types';
import { spacing } from '@/theme';

/**
 * 02.05 Auth / Yeni şifre — Pencil `hMgfW`. Opened from the reset email
 * (`rolt://reset-password?token=…`); no back button, the flow ends at 02.06.
 * An expired or invalid link replaces it with "Bağlantının süresi dolmuş".
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const { service } = useAuth();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = firstParam(params.token);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setPassword(value);
    setFieldError(null);
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(t('errors.passwordTooShort'));
      return;
    }
    setFieldError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      await service.resetPassword(token, password);
      router.replace('/password-updated');
    } catch (error) {
      if (isAuthError(error, 'expired-token')) {
        router.replace({ pathname: '/reset-link-expired', params: { email: error.details.email } });
        return;
      }
      if (isAuthError(error, 'invalid-token')) {
        // Same way out as an expired link; without email/send time the screen asks for the email again.
        router.replace('/reset-link-expired');
        return;
      }
      setFormError(t('errors.network'));
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t('resetPassword.title')}
      subtitle={t('resetPassword.subtitle')}
      errorMessage={formError}>
      <View style={styles.form}>
        <TextField
          label={t('fields.password')}
          placeholder={t('resetPassword.placeholder')}
          value={password}
          onChangeText={handleChange}
          secureToggle
          textContentType="newPassword"
          autoComplete="new-password"
          errorText={fieldError ?? undefined}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        <Button label={t('resetPassword.submit')} loading={submitting} onPress={handleSubmit} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xxl,
  },
});
