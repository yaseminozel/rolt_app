/**
 * Color tokens sampled from the ROLT Pencil design (Core Components + screens).
 * The design only defines a light palette; dark appears solely in isolated
 * usage examples, so no dark tokens are declared here.
 */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFA',
  gray100: '#F3F4F4',
  gray200: '#E5E6E8',
  gray300: '#D2D3D6',
  gray400: '#9EA0A4',
  gray500: '#6B6E73',
  gray800: '#202328',
  gray900: '#101318',
  blue: '#1515FF',
  teal300: '#7BF1DB',
  teal100: '#B7FBEF',
  teal400: '#3BD3B8',
  teal600: '#0E9E82',
  red100: '#FEE2E2',
  red600: '#DC2626',
  red700: '#B91C1C',
  green100: '#DCFCE7',
  green700: '#15803D',
  amber100: '#FEF3C7',
  amber700: '#B45309',
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue700: '#1D4ED8',
} as const;

export const colors = {
  textPrimary: palette.gray900,
  textSecondary: palette.gray500,
  textTertiary: palette.gray400,
  textInverse: palette.white,

  surface: palette.white,
  surfaceSubtle: palette.gray50,
  surfaceMuted: palette.gray100,
  surfaceInverse: palette.gray900,
  surfaceInversePressed: palette.gray800,

  border: palette.gray200,
  borderStrong: palette.gray300,
  borderFocus: palette.gray900,

  brand: palette.blue,

  accent: palette.teal400,
  accentSubtle: palette.teal100,
  accentLight: palette.teal300,
  accentStrong: palette.teal600,

  danger: palette.red600,
  dangerText: palette.red700,
  dangerSurface: palette.red100,
  success: palette.green700,
  successSurface: palette.green100,
  warning: palette.amber700,
  warningSurface: palette.amber100,
  info: palette.blue700,
  infoSurface: palette.blue100,
  infoSubtle: palette.blue50,

  scrim: 'rgba(15, 18, 23, 0.31)',
  glass: 'rgba(255, 255, 255, 0.64)',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
