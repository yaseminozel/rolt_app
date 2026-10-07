import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RouteCard } from '@/components/route/RouteCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { REACH_WINDOWS } from '@/features/routes/queries';
import type { ReachableRoute, ReachWindow, Route } from '@/features/routes/types';
import { formatApproxDuration, formatDistance, formatDuration, formatSpeed } from '@/i18n/format';
import { colors, spacing, typography } from '@/theme';

/** Home shows the nearest three; "Tümünü gör" lists the rest (05.03 `r7NfD9`). */
const HOME_ROUTE_LIMIT = 3;

type ReachableRoutesSectionProps = {
  window: ReachWindow;
  onWindowChange: (window: ReachWindow) => void;
  /** Routes within `window`, nearest first. */
  routes: readonly ReachableRoute[];
  /** "Tümünü gör"; hidden when omitted (offline). */
  onSeeAll?: () => void;
  onRoutePress: (route: Route) => void;
  isSaved: (routeId: string) => boolean;
  onToggleSave: (routeId: string) => void;
};

/**
 * "1 saatte ulaşabileceğin" on Discover Home (05.01 `m3ezc` "Bölüm / 1 saatte ulaşabileceğin"):
 * title with "Tümünü gör", a note on how it is measured, the 30 dk / 1 saat / 2 saat selector
 * and the nearest route rows with the driving time to their start.
 */
export function ReachableRoutesSection({
  window,
  onWindowChange,
  routes,
  onSeeAll,
  onRoutePress,
  isSaved,
  onToggleSave,
}: ReachableRoutesSectionProps) {
  const { t } = useTranslation(['discover', 'routes']);
  const option = (value: ReachWindow) => ({ value, label: t(`reach.windows.${value}`) });
  const [shortest, middle, longest] = REACH_WINDOWS;
  const options = [option(shortest), option(middle), option(longest)] as const;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {t(`reach.title.${window}`)}
        </Text>
        {onSeeAll && routes.length > 0 ? (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="link"
            hitSlop={{ top: spacing.md, bottom: spacing.md, left: spacing.sm, right: spacing.sm }}
            style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.description}>{t('reach.description')}</Text>
      <SegmentedControl
        variant="pill"
        options={options}
        value={window}
        onChange={onWindowChange}
        accessibilityLabel={t('reach.windowsA11y')}
      />
      {routes.length > 0 ? (
        <View style={styles.list}>
          {routes.slice(0, HOME_ROUTE_LIMIT).map(({ route, minutesToStart }) => (
            <RouteCard
              key={route.id}
              variant="row"
              image={route.coverImage}
              title={route.name}
              subtitle={route.summary}
              travelTime={t('reach.toStart', { duration: formatDuration(minutesToStart) })}
              distance={formatDistance(route.distanceKm)}
              duration={formatApproxDuration(route.durationMinutes)}
              speed={formatSpeed(route.averageSpeedKmh)}
              badgeLabel={t(`routes:tags.${route.tag}`)}
              saved={isSaved(route.id)}
              onToggleSave={() => onToggleSave(route.id)}
              onPress={() => onRoutePress(route)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>{t('reach.empty')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    ...typography.headline,
    lineHeight: 22,
    flexShrink: 1,
    color: colors.textPrimary,
  },
  seeAll: {
    ...typography.bodyMedium,
    color: colors.brand,
  },
  pressed: {
    opacity: 0.6,
  },
  description: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});
