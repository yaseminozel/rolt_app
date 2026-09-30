import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { RIDE_TYPES, type RideType } from '@/features/rides/rideTypes';
import { layout } from '@/theme';

import { RideTypeOption } from './RideTypeOption';

/** Horizontal gap between tiles in the strip. */
const OPTION_GAP = 10;

type RideTypeSelectorProps = {
  value: RideType | null;
  onChange: (type: RideType) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Horizontally scrolling strip of all ride type tiles with single selection.
 * Matches "Tip şeridi" in Pencil screen `eUAXU` (02.1 Record / Recording);
 * the "Sürüş tipi" field label above it belongs to the screen.
 */
export function RideTypeSelector({ value, onChange, disabled, style }: RideTypeSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      style={style}
      contentContainerStyle={styles.content}>
      {RIDE_TYPES.map((type) => (
        <RideTypeOption
          key={type}
          type={type}
          selected={type === value}
          disabled={disabled}
          onPress={() => onChange(type)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenGutter,
    gap: OPTION_GAP,
  },
});
