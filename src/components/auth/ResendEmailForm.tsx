import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { spacing } from '@/theme';

import { formatCountdown, useCountdownUntil } from './useCountdown';

const RESEND_COOLDOWN_SECONDS = 60;

export type ResendEmailFormProps = {
  /** Address the link went to; shown read-only. */
  email: string;
  /** Sends the email again; rejects on failure. */
  onResend: () => Promise<void>;
  /** Failure that the screen shows in its own error slot (`null` clears it). */
  onError: (message: string | null) => void;
};

/**
 * "Link sent" block of 02.04 "E-posta kontrol" (`U9gRlP`) and 02.07 "E-posta doğrulama"
 * (`qsvDD`): the address in a read-only field and "E-postayı tekrar gönder" as a text button.
 * After each resend the button waits a minute and counts down, so the inbox isn't flooded.
 */
export function ResendEmailForm({ email, onResend, onError }: ResendEmailFormProps) {
  const { t } = useTranslation('auth');
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [sending, setSending] = useState(false);
  const remaining = useCountdownUntil(cooldownUntil);
  const counting = remaining > 0;

  const handleResend = async () => {
    if (counting || sending || !email) {
      return;
    }
    onError(null);
    setSending(true);
    try {
      await onResend();
      setCooldownUntil(new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000));
    } catch {
      onError(t('errors.network'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.group}>
      <TextField label={t('fields.email')} value={email} onChangeText={noop} disabled />
      <Button
        variant="text"
        label={
          counting
            ? t('resendEmail.countdown', { time: formatCountdown(remaining) })
            : t('resendEmail.action')
        }
        accessibilityLabel={
          counting ? t('resendEmail.countdownA11y', { count: remaining }) : undefined
        }
        disabled={counting || !email}
        loading={sending}
        onPress={handleResend}
      />
    </View>
  );
}

const noop = () => {};

const styles = StyleSheet.create({
  group: {
    gap: spacing.lg,
  },
});
