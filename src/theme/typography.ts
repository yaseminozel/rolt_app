import type { TextStyle } from 'react-native';

/**
 * Font families are loaded per weight with `useFonts` (see `src/theme/fonts.ts`),
 * so each weight is its own family and `fontWeight` must not be set alongside it.
 */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  monoMedium: 'JetBrainsMono_500Medium',
  brand: 'BakbakOne_400Regular',
} as const;

type TextVariant = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

const variant = (family: string, fontSize: number, lineHeight?: number): TextVariant => ({
  fontFamily: family,
  fontSize,
  ...(lineHeight ? { lineHeight } : null),
});

/** Type scale observed in the design (Inter 12–32, JetBrains Mono for ride metrics). */
export const typography = {
  display: variant(fontFamily.semibold, 32),
  title: variant(fontFamily.semibold, 24),
  headline: variant(fontFamily.semibold, 18),
  headlineMedium: variant(fontFamily.medium, 18, 24),
  bodyLarge: variant(fontFamily.regular, 16),
  bodyLargeMedium: variant(fontFamily.medium, 16),
  bodyLargeSemibold: variant(fontFamily.semibold, 16),
  body: variant(fontFamily.regular, 14),
  bodyMedium: variant(fontFamily.medium, 14),
  bodySemibold: variant(fontFamily.semibold, 14),
  callout: variant(fontFamily.regular, 13),
  caption: variant(fontFamily.regular, 12),
  captionMedium: variant(fontFamily.medium, 12),
  metricLarge: variant(fontFamily.monoMedium, 24),
  metric: variant(fontFamily.monoMedium, 15),
  wordmark: variant(fontFamily.brand, 28),
} as const;

export type TypographyVariant = keyof typeof typography;
