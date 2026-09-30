import { Fragment } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, fontFamily, spacing } from '@/theme';

export type StatusTimelineStep = {
  key: string;
  label: string;
  /** Second line, e.g. "Şimdi", "~24 saat", "Bildirim alacaksın". */
  caption?: string;
};

export type StatusTimelineProps = {
  steps: readonly StatusTimelineStep[];
  /** Index of the step in progress; earlier steps are done, later ones upcoming. */
  currentIndex: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const DOT_SIZE = 14;
const DOT_OUTLINE = 2;
const CONNECTOR_HEIGHT = 2;

/**
 * Horizontal status timeline (04.5 "Süreç": Gönderildi → İnceleniyor → Yayında). Done steps
 * and connectors are green, the current step is an amber ring with an amber caption, upcoming
 * steps are grey. Labels align under their dots: first left, last right, others centred.
 * Designed for 2–4 short steps.
 */
export function StatusTimeline({ steps, currentIndex, accessibilityLabel, style }: StatusTimelineProps) {
  const stateOf = (index: number) => (index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming');
  const alignOf = (index: number): TextStyle['textAlign'] =>
    index === 0 ? 'left' : index === steps.length - 1 ? 'right' : 'center';

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        accessibilityLabel ?? steps.map((step) => [step.label, step.caption].filter(Boolean).join(', ')).join('; ')
      }>
      <View style={styles.track}>
        {steps.map((step, index) => {
          const state = stateOf(index);
          return (
            <Fragment key={step.key}>
              {index > 0 ? (
                <View style={[styles.connector, index <= currentIndex && styles.connectorDone]} />
              ) : null}
              <View
                style={[
                  styles.dot,
                  state === 'done' && styles.dotDone,
                  state === 'current' && styles.dotCurrent,
                  state === 'upcoming' && styles.dotUpcoming,
                ]}
              />
            </Fragment>
          );
        })}
      </View>
      <View style={styles.labels}>
        {steps.map((step, index) => {
          const state = stateOf(index);
          const textAlign = alignOf(index);
          return (
            <View key={step.key} style={styles.labelColumn}>
              <Text style={[styles.label, { textAlign }, state === 'upcoming' && styles.labelUpcoming]} numberOfLines={1}>
                {step.label}
              </Text>
              {step.caption ? (
                <Text
                  style={[
                    styles.caption,
                    { textAlign },
                    state === 'done' && styles.captionDone,
                    state === 'current' && styles.captionCurrent,
                  ]}
                  numberOfLines={1}>
                  {step.caption}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connector: {
    flex: 1,
    height: CONNECTOR_HEIGHT,
    backgroundColor: colors.border,
  },
  connectorDone: {
    backgroundColor: colors.success,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotDone: {
    backgroundColor: colors.success,
  },
  dotCurrent: {
    backgroundColor: colors.surface,
    borderWidth: DOT_OUTLINE,
    borderColor: colors.warning,
  },
  dotUpcoming: {
    backgroundColor: colors.surface,
    borderWidth: DOT_OUTLINE,
    borderColor: colors.borderStrong,
  },
  labels: {
    flexDirection: 'row',
  },
  labelColumn: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
  },
  labelUpcoming: {
    color: colors.textSecondary,
  },
  // Design draws the upcoming caption in `textTertiary` (2.6:1 at 11 pt); `textSecondary` keeps AA.
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 13,
    color: colors.textSecondary,
  },
  captionDone: {
    color: colors.success,
  },
  captionCurrent: {
    color: colors.warning,
  },
});
