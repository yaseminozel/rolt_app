import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import type { RouteStop } from '@/features/routes/types';
import { formatApproxDuration, formatDistance, formatNumber } from '@/i18n/format';
import { colors, fontFamily, radius, spacing } from '@/theme';

const ROW_HEIGHT = 76;
const MARKER_SIZE = 24;
const RAIL_WIDTH = 28;
const LINE_WIDTH = 1.2;
/** Dashed connector between stops (05.04 "Bağlantı çizgisi"). */
const LINE_DASH = '3 3';

/**
 * "Rota kartı" of 05.04 Uzun içerik (`1005:36481`): numbered stops on a dashed rail — filled
 * markers for start and finish, outlined for the stops in between — with the stop type, name
 * and the distance and riding time from the start.
 */
export function RouteStopsCard({ stops }: { stops: RouteStop[] }) {
  const { t } = useTranslation('routeDetail');
  const last = stops.length - 1;

  return (
    <View style={styles.card}>
      {stops.map((stop, index) => {
        const filled = stop.kind !== 'stop';
        const detail =
          stop.kind === 'start'
            ? formatDistance(stop.distanceKm)
            : t('stops.progress', {
                distance: formatDistance(stop.distanceKm),
                duration: formatApproxDuration(stop.durationMinutes),
              });
        return (
          <View
            key={`${stop.kind}-${index}`}
            style={styles.row}
            accessible
            accessibilityLabel={`${t(`stops.kind.${stop.kind}`)}: ${stop.name}, ${detail}`}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.line,
                  index === 0 && styles.lineFromMiddle,
                  index === last && styles.lineToMiddle,
                ]}>
                <Svg width={LINE_WIDTH} height="100%">
                  <Line
                    x1={LINE_WIDTH / 2}
                    y1={0}
                    x2={LINE_WIDTH / 2}
                    y2="100%"
                    stroke={colors.textSecondary}
                    strokeWidth={LINE_WIDTH}
                    strokeDasharray={LINE_DASH}
                  />
                </Svg>
              </View>
              <View style={[styles.marker, filled ? styles.markerFilled : styles.markerOutlined]}>
                <Text style={[styles.number, filled && styles.numberInverse]}>
                  {formatNumber(index + 1)}
                </Text>
              </View>
            </View>
            <View style={styles.text}>
              <Text style={styles.kind}>{t(`stops.kind.${stop.kind}`)}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {stop.name}
              </Text>
              <Text style={styles.detail}>{detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: LINE_WIDTH,
  },
  lineFromMiddle: {
    top: ROW_HEIGHT / 2,
  },
  lineToMiddle: {
    bottom: ROW_HEIGHT / 2,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerFilled: {
    backgroundColor: colors.surfaceInverse,
  },
  markerOutlined: {
    borderWidth: 1.2,
    borderColor: colors.emptyStateGlyph,
    backgroundColor: colors.surface,
  },
  number: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  numberInverse: {
    color: colors.textInverse,
  },
  text: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  kind: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  name: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
