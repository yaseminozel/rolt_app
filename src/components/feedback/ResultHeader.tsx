import { Check, CloudXmark, InfoCircle } from 'iconoir-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { colors, fontFamily, spacing, typography } from '@/theme';

export type ResultHeaderTone = 'success' | 'error' | 'info';

export type ResultHeaderProps = {
  tone: ResultHeaderTone;
  title: string;
  description?: string;
  /** Overrides the tone's glyph (Iconoir), e.g. `WifiOff` for an offline result. */
  icon?: ComponentType<SvgProps>;
  style?: StyleProp<ViewStyle>;
};

type Tone = { halo: string; disc: string; Icon: ComponentType<SvgProps> };

const TONES: Record<ResultHeaderTone, Tone> = {
  success: { halo: colors.successSurface, disc: colors.success, Icon: Check },
  error: { halo: colors.dangerSurface, disc: colors.dangerText, Icon: CloudXmark },
  info: { halo: colors.infoSurface, disc: colors.info, Icon: InfoCircle },
};

const HALO_SIZE = 76;
const DISC_SIZE = 52;
const GLYPH_SIZE = 28;

/**
 * Hero of a full-screen result (04.5 "Başarı", 04.6 "Hata"): 76 pt tinted halo with a solid
 * 52 pt disc and white glyph, a 22 pt title and a centred description. `StatusIcon` (40 pt,
 * fixed info glyph) and `EmptyState` (small badge + action) are different patterns, hence a
 * separate component. The title is announced as a header; the icon is decorative.
 */
export function ResultHeader({ tone, title, description, icon, style }: ResultHeaderProps) {
  const toneStyle = TONES[tone];
  const Icon = icon ?? toneStyle.Icon;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[styles.halo, { backgroundColor: toneStyle.halo }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <View style={[styles.disc, { backgroundColor: toneStyle.disc }]}>
          <Icon width={GLYPH_SIZE} height={GLYPH_SIZE} color={colors.textInverse} strokeWidth={2.2} />
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 14,
    paddingTop: spacing.sm,
  },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignSelf: 'stretch',
    gap: 6,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 22,
    lineHeight: 27,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyRelaxed,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
