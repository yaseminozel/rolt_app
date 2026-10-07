import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, radius, shadows, spacing } from '@/theme';

type NavigationSummaryProps = {
  /** "18 dk". */
  remaining: string;
  /** "9,4 km · Varış 10:23". */
  detail: string;
  finishLabel: string;
  onFinish: () => void;
};

const FINISH_HEIGHT = 60;

/** "Overlay / Bottom Sheet · Önizleme" (06.06): time and distance left with the "Bitir" button. */
export function NavigationSummary({ remaining, detail, finishLabel, onFinish }: NavigationSummaryProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.handle} />
      <View style={styles.row}>
        <View style={styles.text} accessible accessibilityLabel={`${remaining}, ${detail}`}>
          <Text style={styles.remaining}>{remaining}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
        <Pressable
          onPress={onFinish}
          accessibilityRole="button"
          style={({ pressed }) => [styles.finish, pressed && styles.finishPressed]}>
          <Text style={styles.finishLabel}>{finishLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.xs,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    boxShadow: shadows.bottomPanel,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingRight: spacing.lg,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.xxl,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  remaining: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  finish: {
    height: FINISH_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInverse,
  },
  finishPressed: {
    backgroundColor: colors.surfaceInverseActive,
  },
  finishLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textInverse,
  },
});
