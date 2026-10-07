import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback/ToastProvider';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { isStrongPassword } from '@/features/auth/credentials';
import { isAuthError } from '@/features/auth/types';
import { colors, layout, spacing } from '@/theme';

type Errors = { current?: string; next?: string; confirm?: string };

/**
 * 10.03 Şifre değiştir (Pencil `Zrcli`, error `HIrq0`): current password, new password (8+
 * characters, a digit and an uppercase letter) twice. "Şifreyi güncelle" stays disabled until all
 * three are filled; on success the account page shows "Şifren güncellendi." (`FADHd`).
 * "Şifremi unuttum" sends the reset email directly, since the reset flow (02.03) is for
 * signed-out riders.
 */
export default function ChangePasswordScreen() {
  const { t } = useTranslation('settings');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { session, service, changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const clear = (key: keyof Errors) => setErrors((value) => ({ ...value, [key]: undefined }));

  const submit = async () => {
    const found: Errors = {};
    if (!isStrongPassword(next)) {
      found.next = t('changePassword.errors.weak');
    } else if (next === current) {
      found.next = t('changePassword.errors.sameAsCurrent');
    }
    if (confirm !== next) {
      found.confirm = t('changePassword.errors.mismatch');
    }
    setErrors(found);
    if (found.next || found.confirm) {
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      showToast({ variant: 'success', message: t('account.passwordUpdated') });
      router.back();
    } catch (error) {
      if (isAuthError(error, 'invalid-credentials')) {
        setErrors({ current: t('changePassword.errors.wrongCurrent') });
      } else {
        showToast({ variant: 'failure', message: t('changePassword.errors.network') });
      }
    } finally {
      setSaving(false);
    }
  };

  const forgot = async () => {
    if (!session) {
      return;
    }
    await service.requestPasswordReset(session.email).catch(() => undefined);
    showToast({
      variant: 'success',
      message: t('changePassword.resetSent', { email: session.email }),
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: t('changePassword.title') }} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <TextField
            label={t('changePassword.current')}
            value={current}
            onChangeText={(value) => {
              setCurrent(value);
              clear('current');
            }}
            placeholder={t('changePassword.currentPlaceholder')}
            secureToggle
            textContentType="password"
            autoComplete="current-password"
            errorText={errors.current}
          />
          <TextField
            label={t('changePassword.new')}
            value={next}
            onChangeText={(value) => {
              setNext(value);
              clear('next');
            }}
            placeholder={t('changePassword.newPlaceholder')}
            secureToggle
            textContentType="newPassword"
            autoComplete="new-password"
            helperText={t('changePassword.newHint')}
            errorText={errors.next}
          />
          <TextField
            label={t('changePassword.confirm')}
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value);
              clear('confirm');
            }}
            placeholder={t('changePassword.confirmPlaceholder')}
            secureToggle
            textContentType="newPassword"
            autoComplete="new-password"
            errorText={errors.confirm}
          />
          <Button
            variant="text"
            label={t('changePassword.forgot')}
            onPress={forgot}
            style={styles.forgot}
          />
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            size="lg"
            label={t('changePassword.submit')}
            onPress={submit}
            loading={saving}
            disabled={!current || !next || !confirm}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  forgot: {
    alignSelf: 'center',
  },
  bar: {
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
});
