import { CheckCircle, InfoCircle, WarningTriangle, XmarkCircle } from 'iconoir-react-native';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme';

export type MapStatusBannerTone = 'success' | 'warning' | 'info' | 'danger';

const TONES = {
  success: { background: colors.successSurface, ink: colors.success, Icon: CheckCircle },
  warning: { background: colors.warningSurface, ink: colors.warning, Icon: WarningTriangle },
  info: { background: colors.infoSurface, ink: colors.info, Icon: InfoCircle },
  danger: { background: colors.dangerSurface, ink: colors.dangerText, Icon: XmarkCircle },
} as const;

type MapStatusBannerProps = {
  tone: MapStatusBannerTone;
  message: string;
  /** Spinner instead of the tone's glyph, for an ongoing state ("GPS alınıyor.."). */
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Status line floating over the record map, just above the sheet (08.01–08.04 "Badge / Tag"):
 * GPS hazır / alınıyor, GPS zayıf, yarım kalan sürüş, çok kısa sürüş.
 */
export function MapStatusBanner({ tone, message, busy = false, style }: MapStatusBannerProps) {
  const { background, ink, Icon } = TONES[tone];
  return (
    <View
      style={[styles.banner, { backgroundColor: background }, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion={tone === 'danger' || tone === 'warning' ? 'assertive' : 'polite'}>
      {busy ? (
        <ActivityIndicator size="small" color={ink} style={styles.icon} />
      ) : (
        <Icon width={20} height={20} color={ink} strokeWidth={1.5} />
      )}
      <Text style={[styles.message, { color: ink }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.chip,
    boxShadow: shadows.statusBanner,
  },
  icon: {
    width: 20,
    height: 20,
  },
  message: {
    ...typography.bodyMedium,
    flex: 1,
  },
});
