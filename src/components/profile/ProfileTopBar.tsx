import { NavArrowLeft } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { colors, layout, radius, spacing } from '@/theme';

export type ProfileTopBarAction = {
  icon: ComponentType<SvgProps>;
  accessibilityLabel: string;
  onPress: () => void;
  /** E2E selector (Maestro `id:`); see docs/testing.md. */
  testID?: string;
};

type ProfileTopBarProps = {
  /** Shows the leading back button (other rider's profile); the own profile (03.0) has none. */
  onBack?: () => void;
  /** Trailing 20 pt icon actions, e.g. share and "…" (01.8) or QR and settings (03.0). */
  actions: ProfileTopBarAction[];
  /** Leading action of the own profile (09.01 "Action / Ekle (+)"). */
  leading?: ProfileTopBarAction;
};

const BACK_ICON_SIZE = 24;
const ACTION_ICON_SIZE = 20;
/** Design: the bar sits 6 pt under the status bar (y 55 → 49). */
const TOP_OFFSET = 6;
/** Design action frames are 40 pt; targets grow to 44 pt around the same icon centers. */
const DESIGN_ACTION_FRAME = 40;
/** Design: back target at x 8; action frames end on the 16 pt gutter. */
const LEADING_INSET = spacing.sm;
const TRAILING_INSET = layout.screenGutter - (layout.minTouchTarget - DESIGN_ACTION_FRAME) / 2;

/**
 * Profile top bar (gKG8D / Dimdp "ROLT UI/Frame 34" + "Geri"): back chevron on the left and
 * icon actions on the right, drawn over the white screen background. Handles the top inset.
 */
export function ProfileTopBar({ onBack, actions, leading }: ProfileTopBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + TOP_OFFSET }]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('actions.back')}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <NavArrowLeft width={BACK_ICON_SIZE} height={BACK_ICON_SIZE} color={colors.textPrimary} />
        </Pressable>
      ) : leading ? (
        <Pressable
          onPress={leading.onPress}
          accessibilityRole="button"
          accessibilityLabel={leading.accessibilityLabel}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <leading.icon width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} color={colors.textPrimary} />
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        {actions.map(({ icon: Icon, accessibilityLabel, onPress, testID }) => (
          <Pressable
            key={accessibilityLabel}
            onPress={onPress}
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Icon width={ACTION_ICON_SIZE} height={ACTION_ICON_SIZE} color={colors.textPrimary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: LEADING_INSET,
    paddingRight: TRAILING_INSET,
    backgroundColor: colors.surface,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  button: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
});
