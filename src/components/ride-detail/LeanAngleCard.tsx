import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { formatNumber } from '@/i18n/format';
import { colors, fontFamily, radius, spacing } from '@/theme';

const GAUGE_WIDTH = 137;
const GAUGE_HEIGHT = 84;
const SIDE_WIDTH = 88;

/** Minor ticks every 10° between the major 0° / 90° marks (design geometry, 137 × 84 box). */
const MINOR_TICKS = [
  'M106.91 61.23L112.82 60.19',
  'M105.15 54.66L110.79 52.61',
  'M102.27 48.5L107.47 45.5',
  'M98.38 42.93L102.97 39.07',
  'M93.57 38.12L97.43 33.53',
  'M88 34.23L91 29.03',
  'M81.84 31.35L83.89 25.71',
  'M75.27 29.59L76.31 23.68',
  'M61.73 29.59L60.69 23.68',
  'M55.16 31.35L53.11 25.71',
  'M49 34.23L46 29.03',
  'M43.43 38.12L39.57 33.53',
  'M38.62 42.93L34.03 39.07',
  'M34.73 48.5L29.53 45.5',
  'M31.85 54.66L26.21 52.61',
  'M30.09 61.23L24.18 60.19',
];

/** "Kademeli yarım daire göstergesi" (09.06 `1092:18290`), drawn as in the design. */
function LeanGauge() {
  return (
    <Svg width={GAUGE_WIDTH} height={GAUGE_HEIGHT} viewBox={`0 0 ${GAUGE_WIDTH} ${GAUGE_HEIGHT}`}>
      <Defs>
        <LinearGradient id="leanLeft" x1="18" y1="65" x2="59" y2="19" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.brand} stopOpacity={0.1} />
          <Stop offset="0.55" stopColor={colors.brand} stopOpacity={0.4} />
          <Stop offset="1" stopColor={colors.brand} />
        </LinearGradient>
        <LinearGradient id="leanRight" x1="78" y1="19" x2="119" y2="65" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.brand} />
          <Stop offset="0.45" stopColor={colors.brand} stopOpacity={0.4} />
          <Stop offset="1" stopColor={colors.brand} stopOpacity={0.1} />
        </LinearGradient>
      </Defs>
      <Path
        d="M18.5 68C18.5 40.4 40.9 18 68.5 18C96.1 18 118.5 40.4 118.5 68"
        stroke={colors.gaugeTrack}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M19.8 57.2C25.4 36.9 41.2 21.9 58.7 18.9"
        stroke="url(#leanLeft)"
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M78.3 18.9C95.8 21.9 111.6 36.9 117.2 57.2"
        stroke="url(#leanRight)"
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M103.5 68H113.5" stroke={colors.gaugeTickMajor} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M33.5 68H23.5" stroke={colors.gaugeTickMajor} strokeWidth={1.4} strokeLinecap="round" />
      {MINOR_TICKS.map((d) => (
        <Path key={d} d={d} stroke={colors.gaugeTick} strokeWidth={1} strokeLinecap="round" />
      ))}
      <Path d="M69 9V67" stroke={colors.gaugeAxis} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M35 75H102" stroke={colors.gaugeBase} strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

type LeanAngleCardProps = {
  leftDeg: number;
  rightDeg: number;
};

/**
 * "Yatış açısı" (09.06 `1083:18468`): the largest lean to the left and right either side of a
 * half-circle gauge with a rider in the middle. Values are estimated from GPS (`LeanEstimator`).
 */
export function LeanAngleCard({ leftDeg, rightDeg }: LeanAngleCardProps) {
  const { t } = useTranslation('rides');
  const degrees = (value: number) => t('detail.degrees', { value: formatNumber(Math.round(value)) });

  return (
    <View style={styles.section}>
      <Text style={styles.title} accessibilityRole="header">
        {t('detail.leanAngle')}
      </Text>
      <View style={styles.card}>
        <View
          style={styles.side}
          accessible
          accessibilityLabel={`${t('detail.leanLeft')}: ${degrees(leftDeg)}`}>
          <Text style={styles.value}>{degrees(leftDeg)}</Text>
          <Text style={styles.caption}>{t('detail.leanLeft')}</Text>
        </View>
        <View style={styles.gauge} importantForAccessibility="no-hide-descendants">
          <LeanGauge />
          <Text style={[styles.tick, styles.tickTop]}>{degrees(0)}</Text>
          <Text style={[styles.tick, styles.tickUpperLeft]}>{degrees(45)}</Text>
          <Text style={[styles.tick, styles.tickUpperRight]}>{degrees(45)}</Text>
          <Text style={[styles.tick, styles.tickLowerLeft]}>{degrees(90)}</Text>
          <Text style={[styles.tick, styles.tickLowerRight]}>{degrees(90)}</Text>
          <Image
            source={require('../../../assets/images/ride/lean-rider.png')}
            style={styles.rider}
            contentFit="contain"
          />
        </View>
        <View
          style={[styles.side, styles.sideRight]}
          accessible
          accessibilityLabel={`${t('detail.leanRight')}: ${degrees(rightDeg)}`}>
          <Text style={styles.value}>{degrees(rightDeg)}</Text>
          <Text style={styles.caption}>{t('detail.leanRight')}</Text>
        </View>
      </View>
    </View>
  );
}

const TICK_WIDTH = 20;

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  side: {
    width: SIDE_WIDTH,
    height: GAUGE_HEIGHT,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  value: {
    fontFamily: fontFamily.monoMedium,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  gauge: {
    width: GAUGE_WIDTH,
    height: GAUGE_HEIGHT,
  },
  tick: {
    position: 'absolute',
    width: TICK_WIDTH,
    fontFamily: fontFamily.regular,
    fontSize: 7,
    lineHeight: 9,
    color: colors.gaugeLabel,
    textAlign: 'center',
  },
  tickTop: {
    top: 0,
    left: GAUGE_WIDTH / 2 + 0.5 - TICK_WIDTH / 2,
  },
  tickUpperLeft: {
    top: 22,
    left: 20 - TICK_WIDTH / 2,
  },
  tickUpperRight: {
    top: 22,
    left: 117 - TICK_WIDTH / 2,
  },
  tickLowerLeft: {
    top: 55,
    left: 0,
    textAlign: 'left',
  },
  tickLowerRight: {
    top: 55,
    right: 0,
    textAlign: 'right',
  },
  rider: {
    position: 'absolute',
    bottom: GAUGE_HEIGHT - 29 - 46,
    left: GAUGE_WIDTH / 2 + 0.5 - 16,
    width: 32,
    height: 30,
  },
});
