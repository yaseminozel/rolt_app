import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useNotificationPreferences,
  useSetNotificationPreference,
  type NotificationPreferences,
} from '@/features/settings/notificationPreferences';
import { usePermissionStatuses } from '@/features/settings/permissionStatus';
import { hasSupabase } from '@/lib/supabase/client';
import { colors, layout, radius, spacing, typography } from '@/theme';

const SOCIAL: readonly (keyof NotificationPreferences)[] = ['likes', 'comments', 'followers'];

/**
 * 10.09 Bildirimler (Pencil `pJU2V`): which pushes the rider wants, and the phone's own
 * notification switch (the only one that can turn them all off). Signed-in accounts also get the
 * "E-POSTA" card (not drawn; user decision 2026-10-09): consent to news and offers by email.
 */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation('settings');
  const { data: preferences } = useNotificationPreferences();
  const setPreference = useSetNotificationPreference();
  const permissions = usePermissionStatuses();
  const { session } = useAuth();
  const hasEmail = hasSupabase && session !== null;

  const row = (key: keyof NotificationPreferences) => (
    <SettingsRow
      key={key}
      label={t(`notificationsPage.${key}`)}
      description={t(`notificationsPage.${key}Hint`)}
      trailing="switch"
      switchValue={preferences?.[key] ?? false}
      onSwitchValueChange={(value) => setPreference.mutate({ [key]: value })}
    />
  );

  return (
    <>
      <Stack.Screen options={{ title: t('notificationsPage.title') }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('notificationsPage.social')}
          </Text>
          <View style={styles.card}>
            {SOCIAL.map((key, index) => (
              <View key={key}>
                {index > 0 ? <View style={styles.divider} /> : null}
                {row(key)}
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {t('notificationsPage.system')}
          </Text>
          <View style={styles.card}>{row('productUpdates')}</View>
        </View>
        {hasEmail ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('notificationsPage.email')}
            </Text>
            <View style={styles.card}>{row('emailMarketing')}</View>
          </View>
        ) : null}
        <View style={styles.section}>
          <View style={styles.card}>
            <SettingsRow
              label={t('notificationsPage.phoneSettings')}
              description={
                permissions?.notifications === 'on'
                  ? t('notificationsPage.phoneOn')
                  : t('notificationsPage.phoneOff')
              }
              trailing="chevron"
              onPress={() => Linking.openSettings()}
            />
          </View>
          <Text style={styles.footnote}>{t('notificationsPage.footnote')}</Text>
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
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
  footnote: {
    ...typography.caption,
    lineHeight: 17,
    color: colors.textSecondary,
  },
});
