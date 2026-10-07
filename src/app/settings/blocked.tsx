import { Stack } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { useToast } from '@/components/feedback/ToastProvider';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Button } from '@/components/ui/Button';
import { useBlockedRiders, useUnblockRider } from '@/features/riders/queries';
import { initialsOf } from '@/lib/initials';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

/**
 * 10.06 Engellenen kullanıcılar (Pencil `rJ2Ce`): who the rider blocked, with "Engeli kaldır".
 * An empty list (not drawn) shows a short empty state.
 */
export default function BlockedUsersScreen() {
  const { t } = useTranslation(['settings', 'profile']);
  const { showToast } = useToast();
  const { data: blocked, isPending } = useBlockedRiders();
  const unblock = useUnblockRider();

  return (
    <>
      <Stack.Screen options={{ title: t('blocked.title') }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.description}>{t('blocked.description')}</Text>
        {isPending ? (
          <ActivityIndicator color={colors.textSecondary} />
        ) : !blocked || blocked.length === 0 ? (
          <EmptyState
            title={t('blocked.emptyTitle')}
            description={t('blocked.emptyDescription')}
            style={styles.empty}
          />
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('blocked.count', { count: blocked.length })}
            </Text>
            <View style={styles.card}>
              {blocked.map((rider, index) => (
                <Fragment key={rider.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.row}>
                    <ProfileAvatar
                      source={rider.avatar}
                      size={40}
                      initials={initialsOf(rider.name)}
                    />
                    <View style={styles.identity}>
                      <Text style={styles.name} numberOfLines={1}>
                        {rider.name}
                      </Text>
                      <Text style={styles.handle} numberOfLines={1}>
                        {t('profile:handle', { handle: rider.handle })}
                      </Text>
                    </View>
                    <Button
                      variant="outlined"
                      label={t('blocked.unblock')}
                      onPress={() =>
                        unblock.mutateAsync(rider.id).then(() =>
                          showToast({
                            variant: 'success',
                            message: t('blocked.unblocked', { name: rider.name }),
                          }),
                        )
                      }
                    />
                  </View>
                </Fragment>
              ))}
            </View>
          </View>
        )}
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
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  description: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  empty: {
    paddingTop: spacing.xl,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  identity: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  handle: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
