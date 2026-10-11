import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { OrDivider } from '@/components/auth/OrDivider';
import { AppleMark, GoogleMark } from '@/components/auth/SocialProviderMark';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { isValidEmail } from '@/features/auth/credentials';
import { isAuthError, type SocialProvider } from '@/features/auth/types';
import { spacing } from '@/theme';

type PendingAction = SocialProvider | 'email' | null;

/**
 * 02.01 Auth / Giriş — Pencil `ELieI` (empty), `yHjhw` (filled), `V9r7e` (submitting); the
 * invalid-email state follows the TextField error standard. The email CTA is enabled as soon as the field has text; the format
 * is checked on submit. The lookup decides the next step: password (02.02) or the
 * social-provider notice ("Hesap Google ile bağlı").
 */
export default function SignInScreen() {
  const { t } = useTranslation('auth');
  const { service, signInWithProvider, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const canSubmitEmail = email.trim().length > 0;

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(null);
  };

  const handleProvider = async (provider: SocialProvider) => {
    if (pending) {
      return;
    }
    setError(null);
    setPending(provider);
    try {
      // On success the root guards flip and `index` routes on; nothing to navigate here.
      await signInWithProvider(provider);
    } catch {
      setError(t('errors.provider', { provider: t(`providers.${provider}`) }));
      setPending(null);
    }
  };

  const handleEmail = async () => {
    if (pending || !canSubmitEmail) {
      return;
    }
    const normalized = email.trim();
    if (!isValidEmail(normalized)) {
      setEmailError(t('errors.invalidEmail'));
      return;
    }
    setError(null);
    setEmailError(null);
    setPending('email');
    try {
      const result = await service.lookupEmail(normalized);
      if (result.status === 'provider') {
        router.push({
          pathname: '/linked-account',
          params: { email: normalized, provider: result.provider },
        });
      } else {
        router.push({
          pathname: '/password',
          params: { email: normalized, mode: result.status === 'password' ? 'existing' : 'new' },
        });
      }
    } catch (lookupError) {
      setError(
        isAuthError(lookupError, 'rate-limited') ? t('errors.tooManyRequests') : t('errors.network'),
      );
    } finally {
      setPending(null);
    }
  };

  const handleGuest = () => {
    if (!pending) {
      continueAsGuest();
    }
  };

  return (
    <AuthScreen title={t('signIn.title')} errorMessage={error} showLegalFooter testID="sign-in-screen">
      <View style={styles.sections}>
        <View style={styles.social}>
          <Button
            variant="outlined"
            label={t('signIn.google')}
            icon={GoogleMark}
            loading={pending === 'google'}
            onPress={() => handleProvider('google')}
          />
          <Button
            variant="outlined"
            label={t('signIn.apple')}
            icon={AppleMark}
            loading={pending === 'apple'}
            onPress={() => handleProvider('apple')}
          />
        </View>

        <OrDivider label={t('signIn.or')} />

        <View style={styles.emailSection}>
          <TextField
            label={t('fields.email')}
            placeholder={t('fields.emailPlaceholder')}
            value={email}
            onChangeText={handleEmailChange}
            errorText={emailError ?? undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={handleEmail}
            testID="sign-in-email"
          />
          <View style={styles.actions}>
            <Button
              label={t('signIn.continueWithEmail')}
              disabled={!canSubmitEmail}
              loading={pending === 'email'}
              onPress={handleEmail}
              testID="sign-in-continue"
            />
            <Button
              variant="text"
              label={t('signIn.continueAsGuest')}
              onPress={handleGuest}
              testID="sign-in-guest"
            />
          </View>
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: spacing.xxxl,
  },
  social: {
    gap: spacing.lg,
  },
  emailSection: {
    gap: spacing.xxl,
  },
  actions: {
    gap: spacing.lg,
  },
});
