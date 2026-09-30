import { BookmarkSolid, CheckCircle } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

/**
 * `success` / `failure`: tonal toast from "Toast messages" (Pencil `s1KRrb`).
 * `saved` / `removed`: dark bookmark toast from "Feedback/Toast" (Pencil `X3p3d7`).
 */
export type ToastVariant = 'success' | 'failure' | 'saved' | 'removed';

type TonalToastProps = {
  variant: 'success' | 'failure';
  message: string;
  actionLabel?: never;
  onActionPress?: never;
};

type BookmarkToastProps = {
  variant: 'saved' | 'removed';
  message: string;
  /** Trailing text action, e.g. "Görüntüle" (saved) or "Geri al" (removed). */
  actionLabel?: string;
  onActionPress?: () => void;
};

export type ToastProps = (TonalToastProps | BookmarkToastProps) & {
  style?: StyleProp<ViewStyle>;
};

/**
 * Presentational toast. Positioning, timing and queueing belong to the caller.
 * Covers Pencil `s1KRrb` (Success / Failure) and `X3p3d7` (Saved / Removed).
 */
export function Toast({ variant, message, actionLabel, onActionPress, style }: ToastProps) {
  const isBookmark = variant === 'saved' || variant === 'removed';
  const liveRegion = variant === 'failure' ? 'assertive' : 'polite';

  if (!isBookmark) {
    const isSuccess = variant === 'success';
    return (
      <View
        style={[
          styles.container,
          styles.tonal,
          { backgroundColor: isSuccess ? colors.successSurface : colors.dangerSurface },
          style,
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion={liveRegion}>
        {/* The design uses the check-circle glyph for both success and failure. */}
        <CheckCircle
          width={18}
          height={18}
          color={isSuccess ? colors.success : colors.dangerText}
        />
        <Text style={[styles.message, styles.tonalMessage]}>{message}</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, styles.bookmark, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion={liveRegion}>
      <BookmarkSolid width={20} height={20} color={colors.textInverse} />
      <Text style={[styles.message, styles.bookmarkMessage]}>{message}</Text>
      {actionLabel ? (
        <Pressable
          onPress={onActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={12}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  tonal: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  bookmark: {
    minHeight: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceInverse,
  },
  message: {
    ...typography.body,
    lineHeight: 20,
    flex: 1,
  },
  tonalMessage: {
    color: colors.toastText,
  },
  bookmarkMessage: {
    color: colors.textInverse,
  },
  action: {
    ...typography.bodySemibold,
    lineHeight: 20,
    color: colors.accentLight,
  },
});
