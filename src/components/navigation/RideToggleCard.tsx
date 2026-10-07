import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Switch } from '@/components/ui/Switch';
import { colors, fontFamily, radius, spacing } from '@/theme';

export type RideToggle = { key: string; label: string; value: boolean; onChange: (value: boolean) => void };

/** "Sesli yönlendirme" / "Ekranı sürüş boyu açık tut" card on 06.01 ("Kart" with "Satır / Ayar"). */
export function RideToggleCard({ toggles }: { toggles: RideToggle[] }) {
  return (
    <View style={styles.card}>
      {toggles.map((toggle, index) => (
        <Fragment key={toggle.key}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <Pressable
            onPress={() => toggle.onChange(!toggle.value)}
            accessibilityRole="switch"
            accessibilityLabel={toggle.label}
            accessibilityState={{ checked: toggle.value }}
            style={styles.row}>
            <Text style={styles.label}>{toggle.label}</Text>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
              <Switch value={toggle.value} onValueChange={toggle.onChange} />
            </View>
          </Pressable>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.border,
  },
});
