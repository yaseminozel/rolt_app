import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/features/haptics/haptics';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

/**
 * - `neutral`: Core Components switch (`NoZZf`), 44 × 24 track, dark "on" track.
 * - `accent`: settings switch (`kTcEC` "Anahtar"), 44 × 26 track, teal "on" track, shadowed thumb.
 */
export type SwitchTone = 'neutral' | 'accent';

export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  tone?: SwitchTone;
  /** Text to the right of the track (design: "Label"). */
  label?: string;
  /** Outer layout only. */
  style?: StyleProp<ViewStyle>;
};

type TrackColors = { off: string; offPressed: string; on: string; onPressed: string };

const trackColors: Record<SwitchTone, TrackColors> = {
  neutral: {
    off: colors.controlTrack,
    offPressed: colors.controlTrackPressed,
    on: colors.surfaceInverse,
    onPressed: colors.surfaceInversePressed,
  },
  // kTcEC defines only Off / On; it has no pressed colors.
  accent: {
    off: colors.controlTrack,
    offPressed: colors.controlTrack,
    on: colors.accentVivid,
    onPressed: colors.accentVivid,
  },
};

const TRACK_WIDTH = 44;
const TRACK_HEIGHT: Record<SwitchTone, number> = { neutral: 24, accent: 26 };
const THUMB_SIZE: Record<SwitchTone, number> = { neutral: 20, accent: 22 };
const TRACK_PADDING = 2;
const ROW_PADDING_VERTICAL = spacing.sm;
const FOCUS_RING_WIDTH = 2;

/**
 * Switch — Pencil `NoZZf` (Switch / Core Components) and `kTcEC` (Anahtar, settings rows).
 * Values Off / On × states Default, Pressed, Focus, Disabled. The design's Hover column
 * maps to Pressed on touch; Focus renders only on keyboard/accessibility focus.
 * The `accent` tone has no pressed/focus/disabled design and reuses the neutral ones
 * where needed (disabled track colors, focus ring).
 */
export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  tone = 'neutral',
  label,
  style,
}: SwitchProps) {
  const [focused, setFocused] = useState(false);
  const toneColors = trackColors[tone];
  const trackHeight = TRACK_HEIGHT[tone];
  const thumbSize = THUMB_SIZE[tone];
  const rowHeight = trackHeight + ROW_PADDING_VERTICAL * 2;
  const verticalSlop = Math.max(0, (layout.touchTarget - rowHeight) / 2);
  const horizontalSlop = label ? 0 : Math.max(0, (layout.touchTarget - TRACK_WIDTH) / 2);

  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onValueChange(!value);
      }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={{
        top: verticalSlop,
        bottom: verticalSlop,
        left: horizontalSlop,
        right: horizontalSlop,
      }}
      style={[styles.row, style]}
    >
      {({ pressed }) => {
        const trackColor = disabled
          ? value
            ? colors.controlOnDisabled
            : colors.surfaceDisabled
          : value
            ? pressed
              ? toneColors.onPressed
              : toneColors.on
            : pressed
              ? toneColors.offPressed
              : toneColors.off;

        return (
          <>
            <View
              style={[
                styles.track,
                {
                  height: trackHeight,
                  backgroundColor: trackColor,
                  justifyContent: value ? 'flex-end' : 'flex-start',
                },
              ]}
            >
              <View
                style={[
                  styles.thumb,
                  { width: thumbSize, height: thumbSize },
                  tone === 'accent' && styles.thumbShadow,
                ]}
              />
              {focused && !disabled ? <View style={styles.focusRing} /> : null}
            </View>
            {label ? (
              <Text style={[styles.label, { color: disabled ? colors.textSecondary : colors.textPrimary }]}>
                {label}
              </Text>
            ) : null}
          </>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: ROW_PADDING_VERTICAL,
  },
  track: {
    width: TRACK_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    padding: TRACK_PADDING,
    borderRadius: radius.pill,
  },
  thumb: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  thumbShadow: {
    boxShadow: shadows.subtle,
  },
  // Design: 2 px stroke aligned outside the track.
  focusRing: {
    position: 'absolute',
    top: -FOCUS_RING_WIDTH,
    right: -FOCUS_RING_WIDTH,
    bottom: -FOCUS_RING_WIDTH,
    left: -FOCUS_RING_WIDTH,
    borderRadius: radius.pill,
    borderWidth: FOCUS_RING_WIDTH,
    borderColor: colors.borderFocus,
  },
  label: {
    ...typography.bodyLarge,
    flexShrink: 1,
  },
});
