import { WifiXmark } from 'iconoir-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing, typography } from '@/theme';

const BAND_HEIGHT = 40;
const ICON_SIZE = 20;

type OfflineBannerProps = {
  title: string;
  retryLabel: string;
  onRetry: () => void;
};

/** "Durum bandı / Çevrimdışı" on Discover Home (05.01 `INwLr` `Cjx0l`): dark band with retry. */
export function OfflineBanner({ title, retryLabel, onRetry }: OfflineBannerProps) {
  return (
    <View style={styles.band} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <WifiXmark width={ICON_SIZE} height={ICON_SIZE} color={colors.textInverse} strokeWidth={1.5} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        hitSlop={{ top: spacing.md, bottom: spacing.md, left: spacing.sm, right: spacing.sm }}
        style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.retry}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    minHeight: BAND_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xxs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceInverse,
  },
  title: {
    ...typography.bodySemibold,
    flex: 1,
    lineHeight: 20,
    color: colors.textInverse,
  },
  retry: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.accentLight,
  },
  pressed: {
    opacity: 0.6,
  },
});
