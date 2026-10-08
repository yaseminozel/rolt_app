import { MapPin } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { colors, fontFamily, radius, spacing } from '@/theme';

const ROW_HEIGHT = 76;
const RAIL_WIDTH = 28;
const ICON_SIZE = 22;
const LINE_WIDTH = 1.2;
const LINE_DASH = '3 3';

type Endpoint = { name?: string; time: string };

/** Start mark: a ring around a dot (09.06 "Sürüş güzergahı"). */
function StartMark() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 22 22">
      <Circle cx={11} cy={11} r={9} stroke={colors.textPrimary} strokeWidth={2} fill={colors.surface} />
      <Circle cx={11} cy={11} r={5} fill={colors.textPrimary} />
    </Svg>
  );
}

/**
 * "Sürüş güzergahı" (09.06 `1083:18622`): where the ride started and ended, with the clock time
 * of each, joined by a dashed line.
 */
export function RideEndpointsCard({ start, end }: { start: Endpoint; end: Endpoint }) {
  const { t } = useTranslation('rides');
  const rows = [
    { key: 'start', label: t('detail.route.start'), endpoint: start },
    { key: 'end', label: t('detail.route.end'), endpoint: end },
  ] as const;

  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {t('detail.route.title')}
      </Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <View
            key={row.key}
            style={styles.row}
            accessible
            accessibilityLabel={`${row.label}: ${row.endpoint.name ?? ''}, ${row.endpoint.time}`}>
            <View style={styles.rail}>
              <View style={[styles.line, index === 0 ? styles.lineDown : styles.lineUp]}>
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
              <View style={styles.mark}>
                {row.key === 'start' ? (
                  <StartMark />
                ) : (
                  <MapPin width={ICON_SIZE} height={ICON_SIZE} color={colors.textPrimary} strokeWidth={1.8} />
                )}
              </View>
            </View>
            <View style={styles.text}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {row.endpoint.name ?? '–'}
              </Text>
              <Text style={styles.time}>{row.endpoint.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
  },
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
    width: LINE_WIDTH,
  },
  // From under the start mark down to the row's end, and from the row's top to the pin.
  lineDown: {
    top: ROW_HEIGHT / 2 + ICON_SIZE / 2 + spacing.xs,
    bottom: 0,
  },
  lineUp: {
    top: 0,
    bottom: ROW_HEIGHT / 2 + ICON_SIZE / 2 + spacing.xs,
  },
  mark: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  label: {
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
  time: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
