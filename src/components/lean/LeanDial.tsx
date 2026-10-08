import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, fontFamily } from '@/theme';

const WIDTH = 300;
const HEIGHT = 172;
const CX = 150;
const CY = 150;
const R_OUTER = 150;
const R_INNER = 135;
const R_MARKER = 143;
const R_LABEL = 118;
const NEEDLE_LENGTH = 96;
/** The dial spans ±90°; the needle stops at its ends. */
const MAX_DEG = 90;
const UPRIGHT_ZONE_DEG = 10;

/** Point on the dial for a lean (0 = up, right positive), at radius `r`. */
function point(leanDeg: number, r: number) {
  const angle = ((90 - leanDeg) * Math.PI) / 180;
  return { x: CX + r * Math.cos(angle), y: CY - r * Math.sin(angle) };
}

/** Ring segment between two leans (the dial's 15 pt band). */
function band(fromDeg: number, toDeg: number) {
  const [a, b] = fromDeg <= toDeg ? [fromDeg, toDeg] : [toDeg, fromDeg];
  const o1 = point(a, R_OUTER);
  const o2 = point(b, R_OUTER);
  const i2 = point(b, R_INNER);
  const i1 = point(a, R_INNER);
  const large = b - a > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ');
}

const TICKS = [
  { lean: -60, label: '60°' },
  { lean: -30, label: '30°' },
  { lean: 0, label: '0°' },
  { lean: 30, label: '30°' },
  { lean: 60, label: '60°' },
];

type LeanDialProps = {
  /** Shown lean in degrees, right positive. */
  leanDeg: number;
  /** Needle, pivot and marker colour (dark, red when tilted, amber when shaking). */
  tone: string;
  /** Red band from 0° to the lean while out of the upright zone. */
  showDeviation: boolean;
  leftLabel: string;
  rightLabel: string;
};

/**
 * "Lean gauge / Dial" (08.00, Pencil `xJMU8`): a half ring with the ±10° upright zone, 30° and
 * 60° marks, SOL / SAĞ, and a needle and marker that follow the live reading.
 */
export function LeanDial({ leanDeg, tone, showDeviation, leftLabel, rightLabel }: LeanDialProps) {
  const lean = Math.max(-MAX_DEG, Math.min(MAX_DEG, leanDeg));
  const marker = point(lean, R_MARKER);

  return (
    <View style={styles.dial} importantForAccessibility="no-hide-descendants">
      <Svg width={WIDTH} height={HEIGHT}>
        <Path d={band(-MAX_DEG, MAX_DEG)} fill={colors.surfaceMuted} />
        <Path d={band(-UPRIGHT_ZONE_DEG, UPRIGHT_ZONE_DEG)} fill={colors.leanZone} />
        {showDeviation && Math.abs(lean) > 0.5 ? <Path d={band(0, lean)} fill={colors.danger} /> : null}
        <Rect
          x={CX - 1.5}
          y={CY - NEEDLE_LENGTH}
          width={3}
          height={NEEDLE_LENGTH}
          rx={2}
          fill={tone}
          transform={`rotate(${lean} ${CX} ${CY})`}
        />
        <Circle cx={CX} cy={CY} r={10} fill={tone} stroke={colors.surface} strokeWidth={3} />
        <Circle cx={marker.x} cy={marker.y} r={7} fill={tone} stroke={colors.surface} strokeWidth={2} />
      </Svg>
      {TICKS.map((tick) => {
        const p = point(tick.lean, R_LABEL);
        return (
          <Text
            key={tick.lean}
            style={[styles.tick, tick.lean === 0 && styles.tickZero, { left: p.x - 20, top: p.y - 8 }]}>
            {tick.label}
          </Text>
        );
      })}
      <Text style={[styles.side, styles.sideLeft]}>{leftLabel}</Text>
      <Text style={[styles.side, styles.sideRight]}>{rightLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dial: {
    width: WIDTH,
    height: HEIGHT,
    alignSelf: 'center',
  },
  tick: {
    position: 'absolute',
    width: 40,
    fontFamily: fontFamily.monoMedium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  tickZero: {
    color: colors.textPrimary,
  },
  side: {
    position: 'absolute',
    top: 156,
    width: 40,
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sideLeft: {
    left: 0,
  },
  sideRight: {
    right: 0,
  },
});
