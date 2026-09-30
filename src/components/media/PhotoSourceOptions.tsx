import { NavArrowRight } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, fontFamily, radius, spacing } from '@/theme';

export type PhotoSourceOption = {
  key: string;
  /** Iconoir glyph in the 40 pt tile, e.g. `Camera`, `MediaImageList`. */
  icon: ComponentType<SvgProps>;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export type PhotoSourceOptionsProps = {
  options: readonly PhotoSourceOption[];
  style?: StyleProp<ViewStyle>;
};

const ROW_HEIGHT = 64;
const ICON_BOX_SIZE = 40;
const ICON_SIZE = 20;
const CHEVRON_SIZE = 18;

/**
 * Where to get photos from ("Seçenekler" in `iJrop`): full-width rows with an icon tile,
 * a label and a chevron — "Fotoğraf çek", "Galeriden seç".
 */
export function PhotoSourceOptions({ options, style }: PhotoSourceOptionsProps) {
  return (
    <View style={style}>
      {options.map(({ key, icon: Icon, label, onPress, disabled = false }) => (
        <Pressable
          key={key}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.rowDisabled]}>
          <View style={styles.iconBox}>
            <Icon width={ICON_SIZE} height={ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <NavArrowRight
            width={CHEVRON_SIZE}
            height={CHEVRON_SIZE}
            color={colors.textTertiary}
            strokeWidth={1.5}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  rowPressed: {
    backgroundColor: colors.surfacePressed,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  iconBox: {
    width: ICON_BOX_SIZE,
    height: ICON_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  // 15 pt medium as drawn ("Fotoğraf çek"); same row label size as ProfilePhotoPicker.
  label: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
});
