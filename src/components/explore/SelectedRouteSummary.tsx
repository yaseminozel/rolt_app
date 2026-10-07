import { Image } from 'expo-image';
import { Bookmark, BookmarkSolid, Clock, NavArrowLeft, PathArrow } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { DifficultyIcon } from '@/components/route-detail/icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Route } from '@/features/routes/types';
import { formatDistance, formatDuration } from '@/i18n/format';
import { colors, radius, shadows, spacing, typography } from '@/theme';

import { routeTagBadgeTone } from './routeTagBadgeTone';

const PHOTO_SIZE = { width: 97, height: 120 };
const PHOTO_STROKE = 1.5;
const BACK_ICON_SIZE = 18;
const METRIC_ICON_SIZE = 16;

type SelectedRouteSummaryProps = {
  route: Route;
  /** Routes in the visible area, for "Rotalara geri dön · 12". */
  routeCount: number;
  saved: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  onViewRoute: () => void;
};

/**
 * Sheet content while a route is selected on the explore map (07.01 "Alt sayfa / Seçili rota
 * (Kompakt)"): back-to-list pill, photo, name, summary, tag, distance · duration · difficulty,
 * then bookmark and "Rotayı görüntüle".
 */
export function SelectedRouteSummary({
  route,
  routeCount,
  saved,
  onBack,
  onToggleSave,
  onViewRoute,
}: SelectedRouteSummaryProps) {
  const { t } = useTranslation(['explore', 'routes', 'common']);
  const metrics: { key: string; icon: ComponentType<SvgProps>; value: string }[] = [
    { key: 'distance', icon: PathArrow, value: formatDistance(route.distanceKm) },
    { key: 'duration', icon: Clock, value: formatDuration(route.durationMinutes) },
    { key: 'difficulty', icon: DifficultyIcon, value: t(`routes:difficulty.${route.difficulty}`) },
  ];

  return (
    <View style={styles.content}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        hitSlop={{ top: 6, bottom: 6 }}
        style={({ pressed }) => [styles.backPill, pressed && styles.backPillPressed]}>
        <NavArrowLeft
          width={BACK_ICON_SIZE}
          height={BACK_ICON_SIZE}
          color={colors.textPrimary}
          strokeWidth={1.5}
        />
        <Text style={styles.backLabel}>{t('selected.backToRoutes', { count: routeCount })}</Text>
      </Pressable>

      <View style={styles.summary}>
        <View style={styles.photo}>
          <Image source={route.coverImage} contentFit="cover" style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.info}>
          <View style={styles.heading}>
            <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
              {route.name}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {route.summary}
            </Text>
          </View>
          <Badge
            tone={routeTagBadgeTone[route.tag]}
            size="small"
            label={t(`routes:tags.${route.tag}`)}
            showIcon={false}
          />
          <View style={styles.metrics}>
            {metrics.map(({ key, icon: Icon, value }, index) => (
              <Fragment key={key}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <View style={styles.metric}>
                  <Icon
                    width={METRIC_ICON_SIZE}
                    height={METRIC_ICON_SIZE}
                    color={colors.textPrimary}
                    strokeWidth={1.5}
                  />
                  <Text style={styles.metricValue} numberOfLines={1}>
                    {value}
                  </Text>
                </View>
              </Fragment>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          variant="outlined"
          icon={saved ? BookmarkSolid : Bookmark}
          accessibilityLabel={t('common:actions.save')}
          onPress={onToggleSave}
        />
        <Button label={t('selected.viewRoute')} onPress={onViewRoute} style={styles.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  backPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  backPillPressed: {
    backgroundColor: colors.surfacePressed,
  },
  backLabel: {
    ...typography.bodyMedium,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photo: {
    width: PHOTO_SIZE.width,
    height: PHOTO_SIZE.height,
    borderRadius: radius.lg,
    borderWidth: PHOTO_STROKE,
    borderColor: colors.surface,
    overflow: 'hidden',
    boxShadow: shadows.raised,
    backgroundColor: colors.surfaceMuted,
  },
  info: {
    flex: 1,
    gap: spacing.sm,
  },
  heading: {
    gap: spacing.xs,
  },
  name: {
    ...typography.headline,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  description: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    ...typography.calloutMedium,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  separator: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: {
    flex: 1,
  },
});
