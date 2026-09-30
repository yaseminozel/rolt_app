import { Hourglass, PageEdit, WarningTriangle } from 'iconoir-react-native';
import type { ComponentType, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import type { LngLat } from '@/features/routes/types';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';

import { RouteLineThumbnail } from './RouteLineThumbnail';

/**
 * Status pill on the card's map: `sending` (04.4 "Gönderiliyor"), `inReview` (04.5
 * "İncelemede"), `draftSaved` (04.6 "Taslak olarak kaydedildi"; also fades the line).
 */
export type RouteStatus = 'sending' | 'inReview' | 'draftSaved';

export type RouteStatusCardProps = {
  status: RouteStatus;
  /** Pill text, e.g. "Gönderiliyor". */
  statusLabel: string;
  /** Route line drawn as the schematic thumbnail. */
  geometry: readonly LngLat[];
  title: string;
  /** One line under the title, e.g. "73 km · 1 sa 45 dk · Sahil, Manzaralı". */
  meta: string;
  /** Upload progress: a bar under the map and the percentage at the end of the title row. */
  progress?: { fraction: number; label: string; accessibilityLabel: string };
  /** Extra content inside the card body under the meta line, e.g. a `StatusTimeline`. */
  children?: ReactNode;
  /** Full-width row at the bottom edge of the card, e.g. `RouteStatusCardErrorRow`. */
  footer?: ReactNode;
  /** Thumbnail height; 04.4 draws 150, 04.5 / 04.6 draw 124. */
  mapHeight?: number;
  style?: StyleProp<ViewStyle>;
};

type StatusTone = { surface: string; ink: string; Icon: ComponentType<SvgProps> | null };

const STATUS_TONES: Record<RouteStatus, StatusTone> = {
  sending: { surface: colors.surface, ink: colors.brand, Icon: null },
  inReview: { surface: colors.warningSurface, ink: colors.warning, Icon: Hourglass },
  draftSaved: { surface: colors.surface, ink: colors.success, Icon: PageEdit },
};

const DEFAULT_MAP_HEIGHT = 124;
const PILL_ICON_SIZE = 14;
const PROGRESS_HEIGHT = 4;

/**
 * Route card of the sending / result screens (04.4 `WSDoH`, 04.5 `g3oK7`, 04.6 `GLAlt`):
 * schematic line with a status pill, optional progress bar, title, meta line and optional
 * body / footer slots. Reusable for any "route being uploaded / reviewed / kept as draft"
 * surface (ride sharing, publish as route, profile drafts). All copy comes from the caller.
 */
export function RouteStatusCard({
  status,
  statusLabel,
  geometry,
  title,
  meta,
  progress,
  children,
  footer,
  mapHeight = DEFAULT_MAP_HEIGHT,
  style,
}: RouteStatusCardProps) {
  const tone = STATUS_TONES[status];
  const fraction = progress ? Math.min(Math.max(progress.fraction, 0), 1) : 0;

  return (
    <View style={[styles.card, style]}>
      <View>
        <RouteLineThumbnail geometry={geometry} height={mapHeight} muted={status === 'draftSaved'} />
        <View style={[styles.pill, { backgroundColor: tone.surface }]}>
          {tone.Icon ? (
            <tone.Icon width={PILL_ICON_SIZE} height={PILL_ICON_SIZE} color={tone.ink} strokeWidth={1.8} />
          ) : (
            <ActivityIndicator size="small" color={tone.ink} style={styles.pillSpinner} />
          )}
          <Text style={[styles.pillLabel, { color: tone.ink }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {progress ? (
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel={progress.accessibilityLabel}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100), text: progress.label }}>
          <View style={[styles.progressFill, { width: `${fraction * 100}%` }]} />
        </View>
      ) : null}

      <View style={[styles.body, children ? styles.bodyWithContent : null]}>
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          {progress ? (
            <Text style={styles.percent} importantForAccessibility="no" accessibilityElementsHidden>
              {progress.label}
            </Text>
          ) : null}
        </View>
        {children}
      </View>

      {footer}
    </View>
  );
}

export type RouteStatusCardErrorRowProps = {
  /** e.g. "Sunucuya ulaşılamıyor". */
  message: string;
  /** Short error code shown at the end, e.g. "RT-503". */
  code?: string;
};

/** Red error row at the bottom of a `RouteStatusCard` (04.6 "Hata detayı"). */
export function RouteStatusCardErrorRow({ message, code }: RouteStatusCardErrorRowProps) {
  return (
    <View style={styles.errorRow} accessible accessibilityRole="text" accessibilityLabel={code ? `${message}, ${code}` : message}>
      <WarningTriangle width={16} height={16} color={colors.dangerText} strokeWidth={1.8} />
      <Text style={styles.errorMessage} numberOfLines={2}>
        {message}
      </Text>
      {code ? <Text style={styles.errorCode}>{code}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.media,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  pill: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    boxShadow: shadows.mapPill,
  },
  // The native spinner is ~20 pt; the design's loader glyph is 14.
  pillSpinner: {
    width: PILL_ICON_SIZE,
    height: PILL_ICON_SIZE,
    transform: [{ scale: 0.7 }],
  },
  pillLabel: {
    ...typography.captionMedium,
    fontFamily: fontFamily.semibold,
    lineHeight: 15,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: PROGRESS_HEIGHT,
    backgroundColor: colors.brand,
  },
  body: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  // 04.5 "Bilgi": 14 pt between the title block and the timeline, 16 pt bottom inset.
  bodyWithContent: {
    gap: 14,
    paddingBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleText: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  percent: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 18,
    color: colors.brand,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.statusErrorOuter,
    borderTopWidth: 1,
    borderTopColor: colors.dangerSurface,
  },
  errorMessage: {
    flex: 1,
    ...typography.calloutSemibold,
    lineHeight: 16,
    color: colors.dangerText,
  },
  // Design: the code in the error red at 50 % alpha; kept at full tone for contrast (AA).
  errorCode: {
    ...typography.captionMedium,
    lineHeight: 15,
    color: colors.danger,
  },
});
