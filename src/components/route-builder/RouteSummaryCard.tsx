import { Image, type ImageProps } from 'expo-image';
import { NavArrowRight } from 'iconoir-react-native';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { routeTagTones } from '@/components/map/routeTagTones';
import type { RouteDifficulty, RouteTag } from '@/features/routes/types';
import { colors, fontFamily, radius, spacing, typography } from '@/theme';

export type RouteSummaryMetric = { key: string; label: string; value: string };

export type RouteSummaryCardProps = {
  name: string;
  tags?: readonly RouteTag[];
  difficulty?: RouteDifficulty | null;
  /** Place names in order: start, stops…, end ("A Kadıköy › Ağva › B Şile Feneri"). */
  path?: readonly string[];
  /**
   * Stops beyond `maxVisibleStops` collapse into one chip; this returns its text, e.g.
   * "+3 durak". Without it every stop is listed (the row wraps).
   */
  hiddenStopsLabel?: (count: number) => string;
  /** Stops listed before collapsing (default 2). */
  maxVisibleStops?: number;
  /** Equal-width tiles, e.g. Mesafe / Süre / Tırmanış. Values are pre-formatted. */
  metrics?: readonly RouteSummaryMetric[];
  /** Up to three are stacked; the first (cover) sits on top. */
  photos?: readonly ImageProps['source'][];
  /** Caption above the description, e.g. "3 fotoğraf · Açıklama". */
  mediaLabel?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
};

/** Start / end markers match the map pins; letters are symbols, not translated copy. */
const START_MARKER = 'A';
const END_MARKER = 'B';
const MARKER_SIZE = 18;
const PHOTO_SIZE = 56;
const PHOTO_OFFSET = 18;
const MAX_STACKED_PHOTOS = 3;
const DEFAULT_MAX_VISIBLE_STOPS = 2;

/**
 * Read-only summary of a route before it is published (04.3 "Özet", "Rota metrikleri",
 * "Medya ve açıklama"): name, tag and difficulty pills, the waypoint path, metric tiles and a
 * photo stack with the description. Props-driven so ride sharing / "Rota olarak yayımla" and
 * profile drafts can reuse it; sections without data are left out.
 */
export function RouteSummaryCard({
  name,
  tags = [],
  difficulty,
  path = [],
  hiddenStopsLabel,
  maxVisibleStops = DEFAULT_MAX_VISIBLE_STOPS,
  metrics = [],
  photos = [],
  mediaLabel,
  description,
  style,
}: RouteSummaryCardProps) {
  const { t } = useTranslation('routes');
  const hasPills = tags.length > 0 || !!difficulty;
  const hasMedia = photos.length > 0 || !!description;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.summary}>
        <Text style={styles.name} accessibilityRole="header">
          {name}
        </Text>
        {hasPills ? (
          <View style={styles.pills}>
            {tags.map((tag) => (
              <Pill key={tag} label={t(`tags.${tag}`)} ink={routeTagTones[tag].ink} surface={routeTagTones[tag].surface} />
            ))}
            {difficulty ? (
              <Pill label={t(`difficulty.${difficulty}`)} ink={colors.textBody} surface={colors.surfaceMuted} />
            ) : null}
          </View>
        ) : null}
        {path.length >= 2 ? (
          <PathRow path={path} hiddenStopsLabel={hiddenStopsLabel} maxVisibleStops={maxVisibleStops} />
        ) : null}
      </View>

      {metrics.length > 0 ? (
        <View style={styles.metrics}>
          {metrics.map((metric) => (
            <View
              key={metric.key}
              style={styles.metric}
              accessible
              accessibilityLabel={`${metric.label}: ${metric.value}`}>
              <Text style={styles.metricLabel} numberOfLines={1}>
                {metric.label}
              </Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {metric.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasMedia ? (
        <View style={styles.media}>
          {photos.length > 0 ? <PhotoStack photos={photos.slice(0, MAX_STACKED_PHOTOS)} /> : null}
          <View style={styles.mediaText}>
            {mediaLabel ? <Text style={styles.mediaLabel}>{mediaLabel}</Text> : null}
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Pill({ label, ink, surface }: { label: string; ink: string; surface: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: surface }]}>
      <Text style={[styles.pillLabel, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

type PathRowProps = Required<Pick<RouteSummaryCardProps, 'path' | 'maxVisibleStops'>> &
  Pick<RouteSummaryCardProps, 'hiddenStopsLabel'>;

function PathRow({ path, hiddenStopsLabel, maxVisibleStops }: PathRowProps) {
  const start = path[0];
  const end = path[path.length - 1];
  const stops = path.slice(1, -1);
  const collapse = !!hiddenStopsLabel && stops.length > maxVisibleStops;
  const middle = collapse ? [stops[0], hiddenStopsLabel(stops.length - 1)] : stops;
  const items: { key: string; label: string; marker?: 'start' | 'end' }[] = [
    { key: 'start', label: start, marker: 'start' },
    ...middle.map((label, index) => ({ key: `stop-${index}`, label })),
    { key: 'end', label: end, marker: 'end' },
  ];

  return (
    <View style={styles.path} accessible accessibilityLabel={items.map((item) => item.label).join(', ')}>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 ? <NavArrowRight width={14} height={14} color={colors.textTertiary} strokeWidth={1.8} /> : null}
          <View style={styles.pathItem}>
            {item.marker ? (
              <View style={[styles.marker, item.marker === 'start' ? styles.markerStart : styles.markerEnd]}>
                <Text style={styles.markerLabel}>{item.marker === 'start' ? START_MARKER : END_MARKER}</Text>
              </View>
            ) : null}
            <Text style={styles.pathLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

function PhotoStack({ photos }: { photos: readonly ImageProps['source'][] }) {
  return (
    <View
      style={{ width: PHOTO_SIZE + PHOTO_OFFSET * (photos.length - 1), height: PHOTO_SIZE }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {photos.map((source, index) => (
        <Image
          key={index}
          source={source}
          contentFit="cover"
          style={[styles.photo, { left: index * PHOTO_OFFSET, zIndex: photos.length - index }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.lg,
  },
  summary: {
    gap: spacing.sm,
  },
  name: {
    ...typography.headline,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  pillLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 15,
  },
  path: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 6,
    rowGap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  pathItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerStart: {
    backgroundColor: colors.success,
  },
  markerEnd: {
    backgroundColor: colors.surfaceInverse,
  },
  markerLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textInverse,
  },
  pathLabel: {
    flexShrink: 1,
    ...typography.calloutMedium,
    lineHeight: 16,
    color: colors.textBody,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xxs,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  metricLabel: {
    ...typography.caption,
    lineHeight: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricValue: {
    ...typography.bodyMedium,
    lineHeight: 17,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  media: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mediaText: {
    flex: 1,
    gap: spacing.xxs,
  },
  mediaLabel: {
    ...typography.captionMedium,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  description: {
    ...typography.callout,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  photo: {
    position: 'absolute',
    top: 0,
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
