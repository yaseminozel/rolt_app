import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, spacing, typography } from '@/theme';

export type ProfileTab<T extends string> = {
  value: T;
  label: string;
  icon: ComponentType<SvgProps>;
};

type ProfileTabsProps<T extends string> = {
  tabs: readonly ProfileTab<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

const TAB_HEIGHT = 60;
const ICON_SIZE = 20;
const INDICATOR_HEIGHT = 1.5;

/**
 * Full-width profile section tabs ("ROLT UI/Sekmeler / Profil", gKG8D `i7TamB`, Dimdp `ooMgb`):
 * equal columns with a 20 pt icon over a 12 pt label, a 1 pt bottom divider and a 1.5 pt
 * indicator under the selected tab. Not the Segmented Control: these switch page sections.
 */
export function ProfileTabs<T extends string>({ tabs, value, onChange, accessibilityLabel }: ProfileTabsProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <View style={styles.divider} />
      {tabs.map(({ value: tabValue, label, icon: Icon }) => {
        const selected = tabValue === value;
        const tint = selected ? colors.textPrimary : colors.textSecondary;
        return (
          <Pressable
            key={tabValue}
            onPress={() => {
              if (!selected) onChange(tabValue);
            }}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            style={styles.tab}>
            <View style={styles.content}>
              <Icon width={ICON_SIZE} height={ICON_SIZE} color={tint} />
              <Text style={[styles.label, selected ? styles.labelSelected : null]} numberOfLines={1}>
                {label}
              </Text>
            </View>
            {selected ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    backgroundColor: colors.surface,
  },
  divider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  tab: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  label: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  labelSelected: {
    ...typography.captionMedium,
    lineHeight: 16,
    color: colors.textPrimary,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: INDICATOR_HEIGHT,
    backgroundColor: colors.textPrimary,
  },
});
