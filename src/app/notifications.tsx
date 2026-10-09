import { router, Stack } from 'expo-router';
import { ChatBubble, Check, CheckCircle, Group, Heart, PathArrow } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { haptics } from '@/features/haptics/haptics';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/queries';
import type { AppNotification, NotificationKind } from '@/features/notifications/types';
import { formatTimeAgo } from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

const emptyIllustration = require('../../assets/images/notifications/empty.png');

const ICONS: Record<NotificationKind, ComponentType<SvgProps>> = {
  comment: ChatBubble,
  like: Heart,
  routeSuggestion: PathArrow,
  follower: Group,
  suggestionApproved: CheckCircle,
};

const DAY_MS = 24 * 60 * 60 * 1000;
type Section = 'today' | 'thisWeek' | 'earlier';

function sectionOf(createdAt: string, now: number): Section {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const time = Date.parse(createdAt);
  if (time >= startOfToday.getTime()) {
    return 'today';
  }
  return time >= startOfToday.getTime() - 6 * DAY_MS ? 'thisWeek' : 'earlier';
}

/** Where a notification leads (not drawn): rides and followers → profile, routes → Discover / the route. */
function open(notification: AppNotification) {
  switch (notification.kind) {
    case 'routeSuggestion':
      router.navigate('/discover');
      return;
    case 'suggestionApproved':
      if (notification.routeId) {
        router.push({ pathname: '/route/[id]', params: { id: notification.routeId } });
      }
      return;
    default:
      router.navigate('/profile');
  }
}

/**
 * 12.01 Bildirimler (Pencil `k2k0EC` okunmamış var, `ymxpV` tümü okundu, `d0nYX` boş): grouped
 * by day with an unread dot, "Tümünü okundu işaretle", "Hepsini gördün!" once everything is read
 * and an empty state. Tapping a notification marks it read and opens what it is about.
 */
export default function NotificationsScreen() {
  const { t } = useTranslation('notifications');
  const now = useNow(60_000);
  const { data: notifications, isPending } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = notifications ?? [];
  const unread = items.filter((item) => !item.read).length;
  const sections = (['today', 'thisWeek', 'earlier'] as const)
    .map((section) => ({
      section,
      items: items.filter((item) => sectionOf(item.createdAt, now) === section),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <Stack.Screen
        options={{ title: t('title'), headerTitleAlign: 'left', headerShadowVisible: false }}
      />
      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Image source={emptyIllustration} style={styles.illustration} resizeMode="contain" />
          <View style={styles.emptyText}>
            <Text style={styles.emptyTitle} accessibilityRole="header">
              {t('empty.title')}
            </Text>
            <Text style={styles.emptyDescription}>{t('empty.description')}</Text>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <View style={styles.toolbar}>
            <Text style={styles.count} accessibilityLiveRegion="polite">
              {unread > 0 ? t('unread', { count: unread }) : t('allRead')}
            </Text>
            <Button
              icon={Check}
              label={t('markAllRead')}
              onPress={() => {
                haptics.success();
                markAllRead.mutate();
              }}
              disabled={unread === 0}
            />
          </View>

          {sections.map((group) => (
            <View key={group.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t(`sections.${group.section}`)}
              </Text>
              {group.items.map((item) => (
                <NotificationRow
                  key={item.id}
                  notification={item}
                  time={formatTimeAgo(new Date(item.createdAt), now, '')}
                  unreadLabel={t('unreadA11y')}
                  onPress={() => {
                    if (!item.read) {
                      markRead.mutate(item.id);
                    }
                    open(item);
                  }}
                />
              ))}
            </View>
          ))}

          {unread === 0 ? <Text style={styles.seenAll}>{t('seenAll')}</Text> : null}
        </ScrollView>
      )}
    </>
  );
}

function NotificationRow({
  notification,
  time,
  unreadLabel,
  onPress,
}: {
  notification: AppNotification;
  time: string;
  unreadLabel: string;
  onPress: () => void;
}) {
  const Icon = ICONS[notification.kind];
  const unread = !notification.read;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[unread ? unreadLabel : null, notification.title, notification.body, time]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconTile}>
        <Icon width={22} height={22} color={colors.textPrimary} strokeWidth={1.5} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, !unread && styles.titleRead]}>{notification.title}</Text>
        <Text style={[styles.body, !unread && styles.bodyRead]}>{notification.body}</Text>
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
      <View style={styles.dotSlot}>{unread ? <View style={styles.dot} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.surface,
  },
  content: {
    paddingTop: spacing.xs,
    paddingHorizontal: layout.screenGutter,
    paddingBottom: spacing.xxl,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  count: {
    ...typography.calloutMedium,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.eyebrow,
    fontSize: 12,
    lineHeight: 16,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.6,
  },
  iconTile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  titleRead: {
    fontFamily: fontFamily.medium,
    color: colors.textBody,
  },
  body: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textBody,
  },
  bodyRead: {
    color: colors.textSecondary,
  },
  time: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  dotSlot: {
    width: 8,
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  seenAll: {
    ...typography.bodyMedium,
    textAlign: 'center',
    paddingTop: spacing.xxl,
    color: colors.brand,
  },
  illustration: {
    width: 361,
    height: 190,
  },
  emptyText: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  emptyDescription: {
    ...typography.body,
    lineHeight: 22,
    maxWidth: 300,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
