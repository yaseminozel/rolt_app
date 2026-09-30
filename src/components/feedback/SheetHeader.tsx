import { Xmark } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, spacing, typography } from '@/theme';

export type SheetHeaderProps = {
  title: string;
  subtitle?: string;
  /** Shows the close button when provided. */
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Accessible name of the close button ("Kapat" frame in the design). */
const CLOSE_LABEL = 'Kapat';
const CLOSE_ICON_SIZE = 22;

/**
 * Title block at the top of bottom sheets, placed under `SheetContainer`'s drag handle.
 *
 * Standardized from the sheet headers in the screens, which drift between 18/20/22 pt
 * titles and 14/15 pt subtitles: "Sheet başlığı" (`QNOwS`, `oUSaB`, `NgG5e`),
 * "Ride type / Header" (`KL9rd`), "Sort / Header" (`crEBh`) and the settings sheets
 * (`X2Xw3h`, `l4NA5a`, `ffZT0`). The majority pattern wins: 18 pt medium title,
 * 14 pt secondary subtitle, 16 pt gutter and an optional close button.
 */
export function SheetHeader({ title, subtitle, onClose, style }: SheetHeaderProps) {
  return (
    <View style={[styles.container, onClose ? styles.withClose : null, style]}>
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={CLOSE_LABEL}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}>
          <Xmark width={CLOSE_ICON_SIZE} height={CLOSE_ICON_SIZE} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: layout.screenGutter,
  },
  withClose: {
    paddingRight: spacing.sm,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  closeButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.minTouchTarget / 2,
  },
  closeButtonPressed: {
    backgroundColor: colors.surfacePressed,
  },
});
