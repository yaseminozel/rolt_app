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
  // "On" track of the settings switch (kTcEC); also the route line on map cards
  teal350: '#42EBCC',
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
  // Status Icon (YVp1V), toast text and empty-state glyph
  red50: '#FEF6F7',
  red200: '#F9D3D6',
  red500: '#E12234',
  green50: '#F7FCFA',
  green200: '#D4F0E4',
  green500: '#2AB47A',
  amber50: '#FFFCF6',
  amber200: '#FFEFD3',
  amber400: '#FFAF24',
  azure50: '#F2F8FD',
  azure200: '#BFDEF7',
  azure600: '#0668E9',
  slate50: '#F5F7FB',
  slate200: '#DAE3EE',
  slate600: '#485260',
  slate900: '#19212B',
  gray600: '#4D4F55',
  // Ride type badge tones (a2e36)
  gray700: '#393B41',
  orange100: '#FFEDD5',
  orange700: '#C2410C',
  cyan100: '#CFFAFE',
  cyan700: '#0E7490',
} as const;

export const colors = {
  textPrimary: palette.gray900,
  textSecondary: palette.gray500,
  textTertiary: palette.gray400,
  textInverse: palette.white,
  /** Unselected labels in a disabled Segmented Control (Q2D2c). */
  textDisabled: palette.gray300,

  surface: palette.white,
  surfaceSubtle: palette.gray50,
  surfaceMuted: palette.gray100,
  surfaceInverse: palette.gray900,
  surfaceInversePressed: palette.gray800,
  /** Contained Button pressed fill (RC60W). */
  surfaceInverseActive: palette.black,
  /** Disabled Filter Chip fill (iCyEV). */
  surfaceDisabled: palette.gray200,

  border: palette.gray200,
  borderStrong: palette.gray300,
  borderFocus: palette.gray900,
  /** Selected Choice Card outline (n0gSMq). */
  borderSelected: palette.gray500,

  brand: palette.blue,

  accent: palette.teal400,
  accentSubtle: palette.teal100,
  accentLight: palette.teal300,
  accentStrong: palette.teal600,
  /** "On" track of the settings switch (kTcEC). */
  accentVivid: palette.teal350,

  // Form controls: Button (RC60W), Checkbox (QXn80), Radio (UeboI), Switch (NoZZf).
  /** Pressed fill of outlined/text buttons. */
  surfacePressed: palette.gray200,
  /** Unchecked checkbox/radio outline. */
  controlBorder: palette.gray500,
  /** Switch "off" track; unselected ring of the outlined radio (VGCwR). */
  controlTrack: palette.gray300,
  /** Switch "off" track while pressed (design: Hover). */
  controlTrackPressed: palette.gray400,
  /** Checked checkbox/radio fill when disabled. */
  controlSelectedDisabled: palette.gray300,
  /** Switch "on" track when disabled. */
  controlOnDisabled: palette.gray400,

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

  // Status Icon (YVp1V): outer halo, inner disc and glyph per status.
  statusErrorOuter: palette.red50,
  statusErrorInner: palette.red200,
  statusErrorGlyph: palette.red500,
  statusSuccessOuter: palette.green50,
  statusSuccessInner: palette.green200,
  statusSuccessGlyph: palette.green500,
  statusWarningOuter: palette.amber50,
  statusWarningInner: palette.amber200,
  statusWarningGlyph: palette.amber400,
  statusInfoOuter: palette.azure50,
  statusInfoInner: palette.azure200,
  statusInfoGlyph: palette.azure600,
  statusNeutralOuter: palette.slate50,
  statusNeutralInner: palette.slate200,
  statusNeutralGlyph: palette.slate600,
  /** Status icon glyph in Feedback/EmptyState (JaNLr). */
  emptyStateGlyph: palette.gray600,
  /** Message text on tonal toasts (s1KRrb). */
  toastText: palette.slate900,

  // Ride type badge (a2e36) tones without a status equivalent.
  rideCityText: palette.gray700,
  rideOffRoadSurface: palette.orange100,
  rideOffRoadText: palette.orange700,
  rideCoastSurface: palette.cyan100,
  rideCoastText: palette.cyan700,

  scrim: 'rgba(15, 18, 23, 0.31)',
  glass: 'rgba(255, 255, 255, 0.64)',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
