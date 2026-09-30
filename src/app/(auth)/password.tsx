import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  firstParam,
  MIN_PASSWORD_LENGTH,
  parsePasswordMode,
  toTimestampParam,
  type PasswordMode,
} from '@/features/auth/credentials';
import { isAuthError } from '@/features/auth/types';
import { spacing } from '@/theme';

type PasswordFormProps = {
  email: string;
  mode: PasswordMode;
};

/**
 * 00.3 Auth / Şifre — Pencil `UVmmG` (existing account, "Tekrar hoş geldin!"), `rsPB8`
 * (wrong password with remaining attempts) and `p7qdia` (new account, "Hesabını oluştur").
 * `mode` comes from the sign-in email lookup. Running out of attempts replaces this screen
 * with 00.3 "Hesap geçici olarak kilitlendi".
 */
export default function PasswordScreen() {
  const params = useLocalSearchParams<{ email?: string | string[]; mode?: string | string[] }>();
  const email = firstParam(params.email);
  const mode = parsePasswordMode(params.mode);

  if (!email || !mode) {
    return <Redirect href="/sign-in" />;
  }
  return <PasswordForm key={`${mode}:${email}`} email={email} mode={mode} />;
}

function PasswordForm({ email, mode }: PasswordFormProps) {
  const { t } = useTranslation('auth');
  const { signIn, signUp } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const isExisting = mode === 'existing';

  const handleChange = (value: string) => {
    setPassword(value);
    setFieldError(null);
  };

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }
    if (isExisting && password.length === 0) {
      setFieldError(t('errors.passwordRequired'));
      return;
    }
    if (!isExisting && password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(t('errors.passwordTooShort'));
      return;
    }
    setFieldError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      // On success the root guards flip and `index` routes on (tabs or registration).
      await (isExisting ? signIn(email, password) : signUp(email, password));
    } catch (error) {
      if (isAuthError(error, 'account-locked')) {
        router.replace({
          pathname: '/account-locked',
          params: { email, lockedUntil: toTimestampParam(error.details.lockedUntil) },
        });
        return;
      }
      if (isAuthError(error, 'invalid-credentials')) {
        const { remainingAttempts } = error.details;
        setFieldError(
          remainingAttempts === undefined
            ? t('errors.invalidCredentials')
            : t('errors.wrongPassword', { count: remainingAttempts }),
        );
      } else if (isAuthError(error, 'email-in-use')) {
        setFormError(t('errors.emailInUse'));
      } else {
        setFormError(t('errors.network'));
      }
      setSubmitting(false);
    }
  };

  const handleForgot = () => {
    if (!submitting) {
      router.push({ pathname: '/forgot-password', params: { email } });
    }
  };

  // p7qdia: the email already has an account after all, or the user meant to sign in.
  const handleHaveAccount = () => {
    if (!submitting) {
      router.dismissTo('/sign-in');
    }
  };

  return (
    <AuthScreen
      title={isExisting ? t('password.existing.title') : t('password.new.title')}
      subtitle={
        isExisting ? t('password.existing.subtitle', { email }) : t('password.new.subtitle')
      }
      errorMessage={formError}>
      <View style={styles.form}>
        <View style={styles.fields}>
          <TextField label={t('fields.email')} value={email} onChangeText={noop} disabled />
          <TextField
            label={t('fields.password')}
            placeholder={t('fields.passwordPlaceholder')}
            value={password}
            onChangeText={handleChange}
            secureToggle
            textContentType={isExisting ? 'password' : 'newPassword'}
            autoComplete={isExisting ? 'current-password' : 'new-password'}
            helperText={isExisting ? undefined : t('password.new.helper')}
            errorText={fieldError ?? undefined}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoFocus
          />
        </View>
        <View style={styles.actions}>
          <Button
            label={isExisting ? t('password.existing.submit') : t('password.new.submit')}
            loading={submitting}
            onPress={handleSubmit}
          />
          {isExisting ? (
            <Button variant="text" label={t('password.existing.forgot')} onPress={handleForgot} />
          ) : (
            <Button
              variant="text"
              label={t('password.new.haveAccount')}
              onPress={handleHaveAccount}
            />
          )}
        </View>
      </View>
    </AuthScreen>
  );
}

/** The email field is read-only here; changing it means going back to sign-in. */
const noop = () => {};

const styles = StyleSheet.create({
  form: {
    gap: spacing.xxl,
  },
  fields: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.lg,
  },
});
