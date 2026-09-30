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
  // Brand-tinted selection fill (QKDo5 selected brand tile, g4Zy4 selected model, LreVd bike band)
  blue25: '#F3F3FF',
  // Not in the design: pressed brand CTA, derived from `blue` at ~85 % value (same hue).
  blueDeep: '#1111D9',
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
  // Expired reset link note (b1m1YP "Bağlantı … gönderildi")
  orange50: '#FFF7ED',
  orange800: '#9A3412',
  // Location permission banner outline (x3Pqz "Konum izni kapalı")
  orange200: '#FED7AA',
  // Section link on Discover Home (p4CIJi "Tümünü gör")
  teal750: '#227868',
  cyan100: '#CFFAFE',
  cyan700: '#0E7490',
  // Accent info note (LreVd "Sıradaki adım: konum izni")
  teal50: '#D9F8EE',
  teal700: '#0F766E',
  teal800: '#0F5F59',
  // Onboarding eyebrow on the hero photo (sLkVv "SÜR. KEŞFET. PAYLAŞ.")
  cyan300: '#1BF4FF',
  // Notification permission illustration background (RzQd4 "Görsel", top → bottom)
  indigo50: '#EEF0FF',
  indigo100: '#DFE3FF',
  // Map scale bar ink (01.7 `rxpI9`)
  slate700: '#4C5157',
  // Route builder (04.1 "Rota öner"): stop list separators, planned route line, no-route card
  gray150: '#EEF0F1',
  teal500: '#14B8A6',
  red25: '#FEF2F2',
  red250: '#FECACA',
  red800: '#991B1B',
} as const;

export const colors = {
  textPrimary: palette.gray900,
  textSecondary: palette.gray500,
  textTertiary: palette.gray400,
  textInverse: palette.white,
  /** Unselected labels in a disabled Segmented Control (Q2D2c). */
  textDisabled: palette.gray300,
  /** Dark-gray body/label text on selectable chips and neutral notes (Fv4ol, g4Zy4). */
  textBody: palette.gray700,

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
  /** Pressed brand CTA; the design has no pressed state (derived, see palette.blueDeep). */
  brandPressed: palette.blueDeep,
  /** Brand-tinted fill of selected registration options and the garage card band (QKDo5, g4Zy4, LreVd). */
  brandSubtle: palette.blue25,

  accent: palette.teal400,
  accentSubtle: palette.teal100,
  accentLight: palette.teal300,
  accentStrong: palette.teal600,
  /** "On" track of the settings switch (kTcEC). */
  accentVivid: palette.teal350,
  /** Teal text link beside section titles ("Tümünü gör", p4CIJi); 5.6:1 on white. */
  accentLink: palette.teal750,

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

  // Time-related caution note (b1m1YP expired reset link): orange tone.
  cautionSurface: palette.orange50,
  cautionIcon: palette.orange700,
  cautionText: palette.orange800,
  /** Outline of the location permission banner (x3Pqz). */
  cautionBorder: palette.orange200,

  // Info note (InfoNote, LreVd): accent tone.
  noteAccentSurface: palette.teal50,
  noteAccentText: palette.teal700,
  noteAccentTitle: palette.teal800,

  // Onboarding hero (sLkVv): eyebrow and the bottom gradient (tTI43) that keeps white copy legible.
  mediaEyebrow: palette.cyan300,
  mediaGradientClear: 'rgba(0, 0, 0, 0)',
  mediaGradientSoft: 'rgba(0, 0, 0, 0.18)',
  mediaGradientMid: 'rgba(0, 0, 0, 0.72)',
  mediaGradientStrong: 'rgba(0, 0, 0, 0.92)',

  // Location permission map preview (TJtI6): brand-blue accuracy radius, halo and position dot.
  locationRadiusFill: 'rgba(21, 21, 255, 0.08)',
  locationRadiusStroke: 'rgba(21, 21, 255, 0.3)',
  locationHalo: 'rgba(21, 21, 255, 0.18)',

  // Notification permission illustration (RzQd4): gradient panel and translucent preview cards.
  notificationPanelTop: palette.indigo50,
  notificationPanelBottom: palette.indigo100,
  notificationCardSurface: 'rgba(255, 255, 255, 0.92)',

  /** Map scale bar lines and labels (01.7 `rxpI9`). */
  mapScaleInk: palette.slate700,

  // Route builder (04.1 "Rota öner").
  /** Inset separators between stop rows and search sections (D8XrfG "Ayırıcı"). */
  borderSubtle: palette.gray150,
  /**
   * Planned route line on the preview card and the edit map. The design draws `#10B7A6` on the
   * card and `#14B8A6` on the map; normalised to one teal that stays legible on light maps.
   */
  routePlanLine: palette.teal500,
  /** "Yol bulunamadı" card and error row fill, card outline and text (aIGJ2). */
  dangerSubtle: palette.red25,
  dangerBorder: palette.red250,
  dangerStrongText: palette.red800,
  /** Translucent hint pill over the preview card ("Noktaları seçince…", XrNal). */
  mapHintSurface: 'rgba(255, 255, 255, 0.9)',

  // Photo tiles on "Rota bilgileri" (04.2 `fGq4D`, `ldcdM`): upload veil, failed veil, "Kapak" badge.
  mediaUploadingVeil: 'rgba(16, 19, 24, 0.5)',
  mediaFailedVeil: 'rgba(185, 28, 28, 0.8)',
  mediaBadge: 'rgba(16, 19, 24, 0.8)',

  scrim: 'rgba(15, 18, 23, 0.31)',
  /** Behind centered dialogs over a screen ("04.x Çıkış — Taslak kaydet", `zMCLP`). */
  dialogScrim: 'rgba(16, 19, 24, 0.6)',
  glass: 'rgba(255, 255, 255, 0.64)',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
