import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { LinkedAccountRow } from '@/components/auth/LinkedAccountRow';
import { AppleMark, GoogleMark } from '@/components/auth/SocialProviderMark';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam, parseSocialProvider } from '@/features/auth/credentials';
import type { SocialProvider } from '@/features/auth/types';
import { spacing } from '@/theme';

/**
 * 00.2 Auth / Hesap Google ile bağlı — Pencil `nKa0f`. Shown when the sign-in lookup finds an
 * account created with a social provider (params: `email`, `provider`). Apple uses the same
 * layout with its own mark and copy.
 */
export default function LinkedAccountScreen() {
  const params = useLocalSearchParams<{
    email?: string | string[];
    provider?: string | string[];
  }>();
  const email = firstParam(params.email);
  const provider = parseSocialProvider(params.provider);

  if (!email || !provider) {
    return <Redirect href="/sign-in" />;
  }
  return <LinkedAccount email={email} provider={provider} />;
}

type LinkedAccountProps = {
  email: string;
  provider: SocialProvider;
};

function LinkedAccount({ email, provider }: LinkedAccountProps) {
  const { t } = useTranslation('auth');
  const { signInWithProvider } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerName = t(`providers.${provider}`);

  const handleContinue = async () => {
    if (pending) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      // On success the root guards flip and `index` routes on; nothing to navigate here.
      await signInWithProvider(provider, { emailHint: email });
    } catch {
      setError(t('errors.provider', { provider: providerName }));
      setPending(false);
    }
  };

  const handleDifferentEmail = () => {
    if (!pending) {
      router.back();
    }
  };

  return (
    <AuthScreen
      title={t('linkedAccount.title', { provider: providerName })}
      subtitle={t('linkedAccount.subtitle', { email, provider: providerName })}
      errorMessage={error}>
      <View style={styles.content}>
        <LinkedAccountRow
          provider={provider}
          email={email}
          methodLabel={t('linkedAccount.method', { provider: providerName })}
        />
        <View style={styles.actions}>
          {/* The design draws the provider CTA like the sign-in buttons (outlined + official mark). */}
          <Button
            variant="outlined"
            label={t(`signIn.${provider}`)}
            icon={provider === 'google' ? GoogleMark : AppleMark}
            loading={pending}
            onPress={handleContinue}
          />
          <Button
            variant="text"
            label={t('linkedAccount.useDifferentEmail')}
            onPress={handleDifferentEmail}
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
