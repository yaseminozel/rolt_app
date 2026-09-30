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
import type { SocialProvider } from '@/features/auth/types';
import { spacing } from '@/theme';

type PendingAction = SocialProvider | 'email' | null;

/** 00.1 / 00.2 Auth / Giriş — Pencil `O2QTu` (empty), `WhI3m` (filled), `TNFfZ` (submitting). */
export default function SignInScreen() {
  const { t } = useTranslation('auth');
  const { service, signInWithProvider, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmitEmail = isValidEmail(email);

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
    setError(null);
    setPending('email');
    try {
      const mode = await service.lookupEmail(normalized);
      router.push({ pathname: '/password', params: { email: normalized, mode } });
    } catch {
      setError(t('errors.network'));
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
    <AuthScreen title={t('signIn.title')} errorMessage={error}>
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
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={handleEmail}
          />
          <View style={styles.actions}>
            <Button
              label={t('signIn.continueWithEmail')}
              disabled={!canSubmitEmail}
              loading={pending === 'email'}
              onPress={handleEmail}
            />
            <Button variant="text" label={t('signIn.continueAsGuest')} onPress={handleGuest} />
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
