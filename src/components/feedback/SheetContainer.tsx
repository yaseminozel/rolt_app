import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export type SheetContainerProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bottom sheet surface with [24, 24, 0, 0] corners and a drag handle, as used by
 * "Overlay / Bottom Sheet · …" frames (e.g. Pencil `uMtj8`, `zLNlt`).
 * Presentational only: no gestures, animation or safe-area handling.
 */
export function SheetContainer({ children, style }: SheetContainerProps) {
  return (
    <View style={[styles.sheet, style]}>
      <View style={styles.handleArea} accessibilityElementsHidden importantForAccessibility="no">
        <View style={styles.handle} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    overflow: 'hidden',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  handleArea: {
    height: 16,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
});
