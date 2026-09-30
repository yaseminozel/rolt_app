/** Spacing scale used across the design (4 px base). */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

/** Corner radii observed in the design. */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 9999,
} as const;

/** Screen metrics: 393 pt design frames with a 16 pt side gutter. */
export const layout = {
  screenGutter: 16,
  minTouchTarget: 44,
  touchTarget: 48,
} as const;

/** Elevations taken from the design's effect definitions. */
export const shadows = {
  subtle: '0px 1px 1.75px rgba(16, 19, 24, 0.22)',
  raised: '0px 2px 5.25px rgba(8, 18, 23, 0.16)',
  floating: '0px 4px 14px rgba(0, 0, 0, 0.12)',
  overlay: '0px 3px 10.5px rgba(0, 0, 0, 0.14)',
} as const;
