import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { rideTypeLabelKey, type RideType } from '@/features/rides/rideTypes';
import { colors, fontFamily, radius, spacing } from '@/theme';

/** Surface and label colors per ride type tone. */
export const rideTypeBadgeColors: Record<RideType, { background: string; text: string }> = {
  city: { background: colors.surfaceMuted, text: colors.rideCityText },
  longRide: { background: colors.infoSurface, text: colors.info },
  nature: { background: colors.successSurface, text: colors.success },
  curves: { background: colors.warningSurface, text: colors.warning },
  sport: { background: colors.dangerSurface, text: colors.dangerText },
  offRoad: { background: colors.rideOffRoadSurface, text: colors.rideOffRoadText },
  coast: { background: colors.rideCoastSurface, text: colors.rideCoastText },
};

type RideTypeBadgeProps = {
  type: RideType;
  style?: StyleProp<ViewStyle>;
};

/** 24 pt tonal label for a ride type. Pencil node `a2e36` ("Badge / Sürüş Tipi"). */
export function RideTypeBadge({ type, style }: RideTypeBadgeProps) {
  const { t } = useTranslation('rides');
  const tone = rideTypeBadgeColors[type];

  return (
    <View style={[styles.container, { backgroundColor: tone.background }, style]}>
      <Text style={[styles.label, { color: tone.text }]} numberOfLines={1}>
        {t(rideTypeLabelKey(type))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
});
