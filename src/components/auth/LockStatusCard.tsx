import { CheckCircle, Lock } from 'iconoir-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export type LockStatusCardProps = {
  /** `locked`: red countdown card (GFGB4 "Kilit durumu"); `unlocked`: success tone once the wait is over. */
  status: 'locked' | 'unlocked';
  /** Small line above the value, e.g. "Tekrar deneyebilmene". */
  label: string;
  /** Countdown ("14:32") while locked, a short status line once unlocked. */
  value: string;
  /** Spoken instead of the ticking value, so screen readers don't read every second. */
  accessibilityLabel: string;
};

const ICON_DISC_SIZE = 44;
const ICON_SIZE = 20;
/** Icon disc → text gap from the design ("Kilit durumu" gap 14); off the 4 pt scale. */
const CONTENT_GAP = 14;
/** Keeps the card height stable when the countdown line turns into the status line. */
const MIN_HEIGHT = 76;

const tones = {
  locked: { surface: colors.dangerSurface, foreground: colors.dangerText, Icon: Lock },
  unlocked: { surface: colors.successSurface, foreground: colors.success, Icon: CheckCircle },
} as const;

/**
 * Lock status of 00.3 "Hesap geçici olarak kilitlendi" (Pencil `vTztf`): white icon disc,
 * label and a live countdown. After the lock ends it flips to the success tone.
 */
export function LockStatusCard({ status, label, value, accessibilityLabel }: LockStatusCardProps) {
  const tone = tones[status];
  const Icon = tone.Icon;
  const unlocked = status === 'unlocked';

  return (
    <View
      style={[styles.card, { backgroundColor: tone.surface }]}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={unlocked ? 'polite' : 'none'}>
      <View style={styles.disc}>
        <Icon width={ICON_SIZE} height={ICON_SIZE} color={tone.foreground} strokeWidth={1.5} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: tone.foreground }]}>{label}</Text>
        <Text style={[unlocked ? styles.status : styles.countdown, { color: tone.foreground }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CONTENT_GAP,
    minHeight: MIN_HEIGHT,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  disc: {
    width: ICON_DISC_SIZE,
    height: ICON_DISC_SIZE,
    borderRadius: ICON_DISC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  label: {
    ...typography.caption,
  },
  // Counters use JetBrains Mono (CLAUDE.md), so the ticking digits don't shift.
  countdown: {
    ...typography.metricLarge,
  },
  status: {
    ...typography.headline,
  },
});
