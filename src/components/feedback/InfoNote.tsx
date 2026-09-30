import { MapPin, Sparks } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, radius, spacing, typography } from '@/theme';

/**
 * `neutral`: muted box, bare brand-blue icon (Fv4ol "Tercihlerini istediğin zaman…").
 * `accent`: teal box, icon in a white disc (LreVd "Sıradaki adım: konum izni").
 */
export type InfoNoteTone = 'neutral' | 'accent';

export type InfoNoteProps = {
  text: string;
  title?: string;
  tone?: InfoNoteTone;
  /** Iconoir icon; defaults to `Sparks` (neutral) / `MapPin` (accent). */
  icon?: ComponentType<SvgProps>;
  /** Outer layout only (margins). */
  style?: StyleProp<ViewStyle>;
};

const DISC_SIZE = 36;
// Note metrics from the design (Qgn3i / XMnWc); off the 4 pt spacing scale.
const NEUTRAL_GAP = 10;
const NOTE_INSET = 14;

const toneStyles = {
  neutral: {
    surface: colors.surfaceMuted,
    icon: colors.brand,
    title: colors.textPrimary,
    text: colors.textBody,
    iconSize: 16,
    DefaultIcon: Sparks,
  },
  accent: {
    surface: colors.noteAccentSurface,
    icon: colors.noteAccentText,
    title: colors.noteAccentTitle,
    text: colors.noteAccentText,
    iconSize: 18,
    DefaultIcon: MapPin,
  },
} as const;

/**
 * Tinted informational note with an icon, optional title and text
 * (Fv4ol `Qgn3i`, LreVd `XMnWc`). Non-interactive; the icon is decorative.
 */
export function InfoNote({ text, title, tone = 'neutral', icon, style }: InfoNoteProps) {
  const toneStyle = toneStyles[tone];
  const Icon = icon ?? toneStyle.DefaultIcon;
  const accent = tone === 'accent';

  const glyph = (
    <Icon
      width={toneStyle.iconSize}
      height={toneStyle.iconSize}
      color={toneStyle.icon}
      strokeWidth={1.5}
    />
  );

  return (
    <View
      style={[
        styles.container,
        accent ? styles.containerAccent : styles.containerNeutral,
        { backgroundColor: toneStyle.surface },
        style,
      ]}
    >
      <View
        style={accent ? styles.disc : styles.bareIcon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {glyph}
      </View>
      <View style={styles.copy}>
        {title ? (
          <Text style={[styles.title, { color: toneStyle.title }]}>{title}</Text>
        ) : null}
        <Text style={[styles.text, { color: toneStyle.text }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderRadius: radius.md,
  },
  containerNeutral: {
    alignItems: 'flex-start',
    gap: NEUTRAL_GAP,
    paddingVertical: spacing.md,
    paddingHorizontal: NOTE_INSET,
  },
  containerAccent: {
    alignItems: 'center',
    gap: spacing.md,
    padding: NOTE_INSET,
  },
  // Centers the 16 pt glyph on the first 17 pt text line.
  bareIcon: {
    paddingTop: 0.5,
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.calloutSemibold,
  },
  text: {
    ...typography.captionRelaxed,
  },
});
