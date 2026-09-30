import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { formatDistance, formatElevation, formatNumber } from '@/i18n/format';
import { colors, fontFamily } from '@/theme';

import { scaleBarFor } from './mapGeometry';

/** Longest bar the design allows (01.7 `rxpI9`: 140 pt line in a 144 pt frame). */
const MAX_BAR_WIDTH = 140;
const TICK_WIDTH = 1.5;
const LABEL_WIDTH = 48;
/** The end label overhangs the last tick slightly, as in the design. */
const END_OVERHANG = 5;
/** Below this the middle label would collide with the end label. */
const MIN_WIDTH_FOR_MIDDLE_LABEL = 90;

type MapScaleBarProps = {
  /** Ground metres per screen point at the map centre. */
  metersPerPoint: number;
  style?: StyleProp<ViewStyle>;
};

function formatScaleValue(meters: number, withUnit: boolean) {
  if (meters >= 1000) {
    const km = meters / 1000;
    return withUnit ? formatDistance(km, 1) : formatNumber(km, { maximumFractionDigits: 1 });
  }
  return withUnit ? formatElevation(meters) : formatNumber(meters);
}

/**
 * "Ölçek" (01.7 `rxpI9`): 0 · half · full distance over a line with three ticks, sized to
 * the longest round distance (1/2/5 × 10ⁿ) that fits. Replaces the hidden Mapbox scale bar.
 */
export function MapScaleBar({ metersPerPoint, style }: MapScaleBarProps) {
  if (!Number.isFinite(metersPerPoint) || metersPerPoint <= 0) {
    return null;
  }
  const { meters, width } = scaleBarFor(metersPerPoint, MAX_BAR_WIDTH);
  const label = formatScaleValue(meters, true);

  return (
    <View
      style={[styles.container, { width: width + END_OVERHANG }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}>
      <View style={[styles.labels, { width }]}>
        <Text style={[styles.label, styles.labelStart]}>0</Text>
        {width >= MIN_WIDTH_FOR_MIDDLE_LABEL ? (
          <Text style={[styles.label, styles.labelCentered, { left: width / 2 - LABEL_WIDTH / 2 }]}>
            {formatScaleValue(meters / 2, false)}
          </Text>
        ) : null}
        <Text style={[styles.label, styles.labelEnd, { left: width + END_OVERHANG - LABEL_WIDTH }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={[styles.bar, { width }]}>
        <View style={[styles.tick, { left: 0 }]} />
        <View style={[styles.tick, { left: width / 2 - TICK_WIDTH / 2 }]} />
        <View style={[styles.tick, { left: width - TICK_WIDTH }]} />
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 26,
    alignItems: 'flex-start',
  },
  labels: {
    height: 14,
  },
  label: {
    position: 'absolute',
    top: 0,
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
    color: colors.mapScaleInk,
  },
  labelStart: {
    left: 0,
  },
  labelCentered: {
    width: LABEL_WIDTH,
    textAlign: 'center',
  },
  labelEnd: {
    width: LABEL_WIDTH,
    textAlign: 'right',
  },
  bar: {
    height: 12,
  },
  tick: {
    position: 'absolute',
    top: 0,
    width: TICK_WIDTH,
    height: 7,
    backgroundColor: colors.mapScaleInk,
  },
  line: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: colors.mapScaleInk,
  },
});
