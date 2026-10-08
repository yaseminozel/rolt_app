import { router, Stack } from 'expo-router';
import { Lock, Mail, Trash } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SocialProviderIcon } from '@/components/brand/SocialProviderIcon';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { Badge } from '@/components/ui/Badge';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatTimeAgo } from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

/**
 * 10.02 Hesap bilgileri (Pencil `i5mZ9M` e-posta, `L8qkrk` Apple, `FADHd` şifre güncellendi):
 * the sign-in email (read only), the sign-in method, "Şifre değiştir" for email accounts and
 * "Hesabı sil". Nothing on the page is editable, so the design's "Kaydet" button is left out.
 */
export default function AccountScreen() {
  const { t } = useTranslation('settings');
  const { session } = useAuth();
  const now = useNow(60_000);
  const method = session?.signInMethod ?? 'email';
  const changedAt = session?.passwordChangedAt ? new Date(session.passwordChangedAt) : null;

  return (
    <>
      <Stack.Screen options={{ title: t('account.title') }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TextField
          label={t('account.email')}
          value={session?.email ?? ''}
          onChangeText={() => undefined}
          disabled
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('account.methodSection')}
          </Text>
          <View style={styles.methodCard}>
            {method === 'email' ? (
              <Mail width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
            ) : (
              <SocialProviderIcon provider={method} size={24} />
            )}
            <View style={styles.methodText}>
              <Text style={styles.methodName}>{t(`account.methods.${method}`)}</Text>
              <Text style={styles.methodHint}>{t(`account.createdWith.${method}`)}</Text>
            </View>
            <Badge tone="success" size="small" label={t('account.connected')} showIcon={false} />
          </View>
          <Text style={styles.note}>{t(`account.methodNote.${method}`)}</Text>
        </View>

        {method === 'email' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('account.securitySection')}
            </Text>
            <View style={styles.card}>
              <SettingsRow
                icon={Lock}
                label={t('account.changePassword')}
                description={
                  changedAt
                    ? t('account.lastChanged', {
                        when: formatTimeAgo(changedAt, now, t('account.justNow')),
                      })
                    : undefined
                }
                trailing="chevron"
                onPress={() => router.push('/settings/change-password')}
              />
            </View>
            <Text style={styles.note}>{t('account.passwordHint')}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('account.managementSection')}
          </Text>
          <View style={styles.card}>
            <SettingsRow
              icon={Trash}
              label={t('account.deleteAccount')}
              destructive
              trailing="none"
              onPress={() => router.push('/settings/delete-account')}
            />
          </View>
          <Text style={styles.note}>{t('account.deleteNote')}</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.xxl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    ...typography.eyebrow,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  methodText: {
    flex: 1,
    gap: spacing.xxs,
  },
  methodName: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  methodHint: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  note: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
