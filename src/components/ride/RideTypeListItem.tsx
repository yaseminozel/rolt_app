import { Check } from 'iconoir-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { withHaptic } from '@/features/haptics/haptics';
import { rideTypeLabelKey, type RideType } from '@/features/rides/rideTypes';
import { colors, fontFamily, radius, spacing } from '@/theme';

import { RideTypeIcon } from './icons/RideTypeIcon';

/** Inset of the selected-row background (from the design). */
const SELECTION_INSET = spacing.xs;

type RideTypeListItemProps = {
  type: RideType;
  selected: boolean;
  onPress?: () => void;
  /** Secondary line under the title; hidden in every design instance, so optional. */
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 48 pt ride type row used in the ride type bottom sheet (screen `jMs66`).
 * Pencil node `dlaPh` ("List Item / Ride Type", Selected=True/False).
 */
export function RideTypeListItem({
  type,
  selected,
  onPress,
  description,
  disabled,
  style,
}: RideTypeListItemProps) {
  const { t } = useTranslation('rides');
  const label = t(rideTypeLabelKey(type));

  return (
    <Pressable
      onPress={withHaptic(onPress)}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ selected, disabled }}
      style={[styles.container, !description && styles.fixedHeight, style]}>
      {selected ? <View style={styles.selectionBackground} /> : null}
      <RideTypeIcon type={type} size={20} color={colors.textPrimary} strokeWidth={1.5} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {label}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {selected ? <Check width={24} height={24} color={colors.textPrimary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  fixedHeight: {
    height: 48,
  },
  selectionBackground: {
    position: 'absolute',
    top: SELECTION_INSET,
    right: SELECTION_INSET,
    bottom: SELECTION_INSET,
    left: SELECTION_INSET,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textTertiary,
  },
});
