import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam, MIN_PASSWORD_LENGTH } from '@/features/auth/credentials';
import { AuthError } from '@/features/auth/types';
import { spacing } from '@/theme';

/**
 * 00.6 Auth / Yeni Şifre — Pencil `U4fki9`. Opened from the reset email
 * (`rolt://reset-password?token=…`); no back button, the flow ends at 00.7.
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
  const [linkExpired, setLinkExpired] = useState(false);

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
      const expired = error instanceof AuthError && error.code === 'invalid-token';
      setLinkExpired(expired);
      setFormError(expired ? t('errors.invalidToken') : t('errors.network'));
      setSubmitting(false);
    }
  };

  // The screen has no back button, so an expired link needs its own way out.
  const handleRequestNewLink = () => {
    router.replace('/sign-in');
    router.push('/forgot-password');
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
        <View style={styles.actions}>
          <Button label={t('resetPassword.submit')} loading={submitting} onPress={handleSubmit} />
          {linkExpired ? (
            <Button
              variant="text"
              label={t('resetPassword.requestNewLink')}
              onPress={handleRequestNewLink}
            />
          ) : null}
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xxl,
  },
  actions: {
    gap: spacing.lg,
  },
});
