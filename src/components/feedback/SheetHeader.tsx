import { NavArrowLeft } from 'iconoir-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, spacing, typography } from '@/theme';

export type SheetHeaderAction = {
  /** 24 pt icon element; the design leaves the glyph unspecified. */
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
};

export type SheetHeaderProps = {
  title: string;
  onBack: () => void;
  /** Optional trailing 44 pt icon button ("Aksiyon"). */
  action?: SheetHeaderAction;
  style?: StyleProp<ViewStyle>;
};

/**
 * 64 pt top bar with back button, left-aligned title and optional trailing action
 * (Pencil `Gq75K`, "Üst çubuk / Alt sayfa").
 */
export function SheetHeader({ title, onBack, action, style }: SheetHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Geri"
        style={styles.iconButton}>
        <NavArrowLeft width={24} height={24} color={colors.textPrimary} strokeWidth={1.8} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          style={styles.iconButton}>
          {action.icon}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  iconButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headline,
    flex: 1,
    color: colors.textPrimary,
  },
});
