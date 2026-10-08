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
  /** Live lean reading on 08.00 Kalibrasyon (44 pt). */
  monoBold: 'JetBrainsMono_700Bold',
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
  /** Onboarding page heading (01.01–01.03 "Başlık"): 26 bold at 1.23. */
  onboardingTitle: variant(fontFamily.bold, 26, 32),
  /** Prompt sheet heading (ydm6l "Rotayı kaydetmek için giriş yap"): 20 semibold. */
  titleSmall: variant(fontFamily.semibold, 20, 24),
  headline: variant(fontFamily.semibold, 18),
  headlineMedium: variant(fontFamily.medium, 18, 24),
  bodyLarge: variant(fontFamily.regular, 16),
  bodyLargeMedium: variant(fontFamily.medium, 16),
  bodyLargeSemibold: variant(fontFamily.semibold, 16),
  body: variant(fontFamily.regular, 14),
  /** 14 pt at 1.4 line height, for multi-line screen descriptions (AQCUg). */
  bodyRelaxed: variant(fontFamily.regular, 14, 20),
  bodyMedium: variant(fontFamily.medium, 14),
  bodySemibold: variant(fontFamily.semibold, 14),
  callout: variant(fontFamily.regular, 13),
  calloutMedium: variant(fontFamily.medium, 13),
  calloutSemibold: variant(fontFamily.semibold, 13),
  caption: variant(fontFamily.regular, 12),
  /** 12 pt at 1.4 line height, for multi-line notes and helper copy. */
  captionRelaxed: variant(fontFamily.regular, 12, 17),
  captionMedium: variant(fontFamily.medium, 12),
  /** Small uppercase label on cards (LreVd "ANA MOTORUN"): 11 semibold, 0.6 tracking. */
  eyebrow: { ...variant(fontFamily.semibold, 11, 14), letterSpacing: 0.6 },
  metricLarge: variant(fontFamily.monoMedium, 24),
  metric: variant(fontFamily.monoMedium, 15),
  /** Ride card metric values (gKG8D "12,8 km"): Mono 14. */
  metricSmall: variant(fontFamily.monoMedium, 14, 18),
  /** Like / comment / save counters on ride cards (gKG8D "142"): Mono 12. */
  metricCaption: variant(fontFamily.monoMedium, 12, 16),
  wordmark: variant(fontFamily.brand, 28),
} as const;

export type TypographyVariant = keyof typeof typography;
