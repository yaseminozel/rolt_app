import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { rideTypeLabels, type RideType } from '@/features/rides/rideTypes';
import { colors, fontFamily, radius, spacing } from '@/theme';

import { RideTypeIcon } from './icons/RideTypeIcon';

const TILE_SIZE = 60;

type RideTypeOptionProps = {
  type: RideType;
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 60 × 84 selectable ride type tile (icon tile + label).
 * Pencil node `N0mch` ("Seçim / Sürüş Tipi", Tone × Selected).
 */
export function RideTypeOption({ type, selected, onPress, disabled, style }: RideTypeOptionProps) {
  const contentColor = selected ? colors.textPrimary : colors.textSecondary;
  const label = rideTypeLabels[type];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={[styles.container, style]}>
      <View style={[styles.tile, selected && styles.tileSelected]}>
        <RideTypeIcon type={type} size={24} color={contentColor} strokeWidth={1.7} />
      </View>
      <Text
        style={[styles.label, selected && styles.labelSelected, { color: contentColor }]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TILE_SIZE,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.tile,
    backgroundColor: colors.surfaceMuted,
  },
  tileSelected: {
    backgroundColor: colors.accentSubtle,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  labelSelected: {
    fontFamily: fontFamily.semibold,
  },
});
