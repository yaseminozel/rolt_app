import { InfoCircleSolid } from 'iconoir-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

export type StatusIconStatus = 'error' | 'success' | 'warning' | 'info' | 'neutral';

export type StatusIconProps = {
  status: StatusIconStatus;
  style?: StyleProp<ViewStyle>;
};

const toneByStatus: Record<StatusIconStatus, { outer: string; inner: string; glyph: string }> = {
  error: {
    outer: colors.statusErrorOuter,
    inner: colors.statusErrorInner,
    glyph: colors.statusErrorGlyph,
  },
  success: {
    outer: colors.statusSuccessOuter,
    inner: colors.statusSuccessInner,
    glyph: colors.statusSuccessGlyph,
  },
  warning: {
    outer: colors.statusWarningOuter,
    inner: colors.statusWarningInner,
    glyph: colors.statusWarningGlyph,
  },
  info: {
    outer: colors.statusInfoOuter,
    inner: colors.statusInfoInner,
    glyph: colors.statusInfoGlyph,
  },
  neutral: {
    outer: colors.statusNeutralOuter,
    inner: colors.statusNeutralInner,
    glyph: colors.statusNeutralGlyph,
  },
};

/**
 * 40 pt status badge: two concentric discs with a solid info-circle glyph (Pencil `YVp1V`).
 * Every status uses the same glyph in the design; only the colors change. Decorative.
 */
export function StatusIcon({ status, style }: StatusIconProps) {
  const tone = toneByStatus[status];

  return (
    <View
      style={[styles.outer, { backgroundColor: tone.outer }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.inner, { backgroundColor: tone.inner }]}>
        <InfoCircleSolid width={24} height={24} color={tone.glyph} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
