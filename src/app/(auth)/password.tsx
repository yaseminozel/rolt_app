import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { formatClockCountdown, useCountdownUntil } from '@/components/auth/useCountdown';
import { AlertBanner } from '@/components/feedback/AlertBanner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { useHapticOnSet } from '@/features/haptics/useHapticOnSet';
import {
  firstParam,
  LOCK_DURATION_MINUTES,
  MIN_PASSWORD_LENGTH,
  parsePasswordMode,
  type PasswordMode,
} from '@/features/auth/credentials';
import { isAuthError } from '@/features/auth/types';
import { spacing } from '@/theme';

type PasswordFormProps = {
  email: string;
  mode: PasswordMode;
};

/**
 * 02.02 Auth / Şifre — Pencil `U0jqPH` (existing account, "Tekrar hoş geldin!"), `O7kNqu`
 * (new account, "Hoş geldin!"), `Q04agR` (wrong password) and `rjPx3` (too many attempts).
 * `mode` comes from the sign-in email lookup. A lockout stays on this screen: the banner
 * explains it, the CTA counts down to the end of the lock and reset becomes the way out.
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
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const lockRemaining = useCountdownUntil(lockedUntil);
  const locked = lockRemaining > 0;
  useHapticOnSet(locked, 'warning');
  const wasLocked = useRef(false);
  const isExisting = mode === 'existing';

  // The ticking label is not a live region; announce once when the lock ends.
  useEffect(() => {
    if (locked) {
      wasLocked.current = true;
    } else if (wasLocked.current) {
      wasLocked.current = false;
      AccessibilityInfo.announceForAccessibility(t('password.locked.unlocked'));
    }
  }, [locked, t]);

  const handleChange = (value: string) => {
    setPassword(value);
    setFieldError(null);
  };

  const handleSubmit = async () => {
    if (submitting || locked) {
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
      // On success the root guards flip and `index` routes on (verification, tabs or registration).
      await (isExisting ? signIn(email, password) : signUp(email, password));
    } catch (error) {
      if (isAuthError(error, 'account-locked')) {
        setLockedUntil(error.details.lockedUntil);
        setPassword('');
      } else if (isAuthError(error, 'invalid-credentials')) {
        setFieldError(t('errors.invalidCredentials'));
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

  const handleGuest = () => {
    if (!submitting) {
      continueAsGuest();
    }
  };

  const lockMinutes = Math.ceil(lockRemaining / 60);

  return (
    <AuthScreen
      title={isExisting ? t('password.existing.title') : t('password.new.title')}
      subtitle={
        isExisting ? t('password.existing.subtitle', { email }) : t('password.new.subtitle')
      }
      errorMessage={formError}
      showLegalFooter>
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
        {locked ? (
          <AlertBanner
            title={t('password.locked.title')}
            message={t('password.locked.message', { count: LOCK_DURATION_MINUTES })}
          />
        ) : null}
        <View style={styles.actions}>
          <Button
            label={
              locked
                ? t('password.locked.retryIn', { time: formatClockCountdown(lockRemaining) })
                : isExisting
                  ? t('password.existing.submit')
                  : t('password.new.submit')
            }
            accessibilityLabel={
              locked ? t('password.locked.retryInA11y', { count: lockMinutes }) : undefined
            }
            disabled={locked}
            loading={submitting}
            onPress={handleSubmit}
          />
          {isExisting ? (
            <Button
              variant="text"
              label={locked ? t('password.locked.reset') : t('password.existing.forgot')}
              onPress={handleForgot}
            />
          ) : (
            <Button variant="text" label={t('signIn.continueAsGuest')} onPress={handleGuest} />
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
