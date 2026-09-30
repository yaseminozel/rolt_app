import { InfoCircleSolid } from 'iconoir-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontFamily, radius, spacing, typography } from '@/theme';

export type EmptyStateAction = {
  label: string;
  onPress: () => void;
  /** Optional 24 pt trailing icon, e.g. `<Plus />` as in "Rotaları keşfet". */
  trailingIcon?: ReactNode;
};

export type EmptyStateProps = {
  title: string;
  description: string;
  /** Replaces the default status badge (e.g. a `StatusIcon` or an illustration). */
  icon?: ReactNode;
  action?: EmptyStateAction;
  style?: StyleProp<ViewStyle>;
};

/**
 * Centered empty state (Pencil `JaNLr`, "Feedback/EmptyState/SavedRoutes"):
 * status badge, title, description and an optional outlined action.
 * All copy is supplied by the caller.
 */
export function EmptyState({ title, description, icon, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ?? <DefaultIcon />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Text style={styles.actionLabel}>{action.label}</Text>
          {action.trailingIcon ? (
            <View style={styles.actionIcon} importantForAccessibility="no-hide-descendants">
              {action.trailingIcon}
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

/** The badge colors in `JaNLr` differ from every `StatusIcon` status, so they are drawn here. */
function DefaultIcon() {
  return (
    <View
      style={styles.iconOuter}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={styles.iconInner}>
        <InfoCircleSolid width={24} height={24} color={colors.emptyStateGlyph} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoSubtle,
  },
  iconInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  title: {
    ...typography.bodySemibold,
    lineHeight: 20,
    maxWidth: 300,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    lineHeight: 20,
    maxWidth: 300,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  action: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionPressed: {
    backgroundColor: colors.border,
  },
  actionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  actionIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
