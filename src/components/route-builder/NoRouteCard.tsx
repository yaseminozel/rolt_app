import { MapXmark } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

type CardAction = { label: string; onPress: () => void };

export type NoRouteCardProps = {
  title: string;
  message: string;
  /** Red filled action, e.g. "Bostancı İskelesi’ni kullan" or "Tekrar dene". */
  primaryAction?: CardAction;
  /** Outlined action, e.g. "Değiştir". */
  secondaryAction?: CardAction;
  style?: StyleProp<ViewStyle>;
};

const ACTION_HEIGHT = 40;

/**
 * "Sürülebilir yol bulunamadı" card of 04.1 (`DSila`): red-tinted card with the reason and up to
 * two compact actions. The actions keep the design's 40 pt / 13 pt size (hit area 44 pt) because
 * the standard 44 pt button padding would truncate place names in the primary label.
 */
export function NoRouteCard({ title, message, primaryAction, secondaryAction, style }: NoRouteCardProps) {
  return (
    <View style={[styles.card, style]} accessibilityRole="alert">
      <View style={styles.header}>
        <MapXmark width={18} height={18} color={colors.dangerText} strokeWidth={1.8} />
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {primaryAction ? (
            <Pressable
              onPress={primaryAction.onPress}
              accessibilityRole="button"
              hitSlop={(layout.minTouchTarget - ACTION_HEIGHT) / 2}
              style={({ pressed }) => [styles.action, styles.primary, pressed && styles.primaryPressed]}>
              <Text style={[styles.actionLabel, styles.primaryLabel]} numberOfLines={1}>
                {primaryAction.label}
              </Text>
            </Pressable>
          ) : null}
          {secondaryAction ? (
            <Pressable
              onPress={secondaryAction.onPress}
              accessibilityRole="button"
              hitSlop={(layout.minTouchTarget - ACTION_HEIGHT) / 2}
              style={({ pressed }) => [
                styles.action,
                styles.secondary,
                !primaryAction && styles.secondaryAlone,
                pressed && styles.secondaryPressed,
              ]}>
              <Text style={[styles.actionLabel, styles.secondaryLabel]} numberOfLines={1}>
                {secondaryAction.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSubtle,
  },
  header: {
    flexDirection: 'row',
    gap: 10,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...typography.bodySemibold,
    color: colors.dangerStrongText,
  },
  message: {
    ...typography.captionRelaxed,
    color: colors.dangerStrongText,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    height: ACTION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.chip,
  },
  primary: {
    flex: 1,
    backgroundColor: colors.dangerText,
  },
  primaryPressed: {
    backgroundColor: colors.dangerStrongText,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.surface,
  },
  secondaryAlone: {
    flex: 1,
  },
  secondaryPressed: {
    backgroundColor: colors.dangerSubtle,
  },
  actionLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 16,
  },
  primaryLabel: {
    color: colors.textInverse,
  },
  secondaryLabel: {
    color: colors.dangerStrongText,
  },
});
