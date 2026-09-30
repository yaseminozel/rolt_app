import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstParam, isValidEmail } from '@/features/auth/credentials';
import { spacing } from '@/theme';

/** 00.4 Auth / Şifremi Unuttum — Pencil `k0nXp`. Prefilled with the email from 00.3. */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const { service } = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState(() => firstParam(params.email));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isValidEmail(email);

  const handleSubmit = async () => {
    if (submitting || !canSubmit) {
      return;
    }
    const normalized = email.trim();
    setError(null);
    setSubmitting(true);
    try {
      await service.requestPasswordReset(normalized);
      router.push({ pathname: '/check-email', params: { email: normalized } });
    } catch {
      setError(t('errors.network'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t('forgotPassword.title')}
      subtitle={t('forgotPassword.subtitle')}
      errorMessage={error}>
      <View style={styles.form}>
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
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />
        <Button
          label={t('forgotPassword.submit')}
          disabled={!canSubmit}
          loading={submitting}
          onPress={handleSubmit}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xxl,
  },
});
