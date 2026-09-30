import { fontFamily } from '@/theme';

/**
 * Shield outline shared by the Ducati, Triumph and Harley-Davidson marks
 * (Pencil paths `KrdQ4`, `aLHP2`, `ciYMM`), 23.2 × 23.6 placed at (2.4, 2.2).
 */
export const SHIELD_PATH =
  'M11.6 0l11.6 3.4 0 8.7c0 5.9-4.8 9.8-11.6 11.5-6.8-1.7-11.6-5.6-11.6-11.5l0-8.7 11.6-3.4z';

export const SHIELD_TRANSFORM = 'translate(2.4 2.2)';

/**
 * Wordmark text in the marks uses Inter 800. Per-weight families are used,
 * so `fontWeight` must not be set alongside this.
 */
export const MARK_FONT_FAMILY = fontFamily.extraBold;
