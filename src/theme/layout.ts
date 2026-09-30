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
  /** Ride type badge (a2e36). */
  tag: 6,
  sm: 8,
  /** Miniature app icon on notification previews (RzQd4). */
  appIcon: 9,
  /** Filter chips (iCyEV) and large badges (YFU4m); also list selection backgrounds and route row thumbnails. */
  chip: 10,
  md: 12,
  lg: 16,
  /** Ride type option tile (N0mch). */
  tile: 18,
  /** Permission illustration cards (TJtI6, RzQd4). */
  media: 20,
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
  /** Notification preview cards on the notification permission screen (RzQd4). */
  notification: '0px 4px 14px rgba(16, 19, 24, 0.1)',
  /** Floating pill on the Discover map card ("Bu bölgede N rota var", oxSGl). */
  mapPill: '0px 2px 8.75px rgba(0, 0, 0, 0.12)',
  /** Tilted photo cards of the empty search illustration (vKY7V). */
  stackedCard: '0px 8px 15.75px rgba(8, 18, 23, 0.16)',
  /** Round buttons over maps: back, bookmark, layers (01.6 `qw5Tm`, 01.7 `f8509u`). */
  mapAction: '2px 4px 5.16px rgba(152, 152, 152, 0.25)',
  /** Map controls: "Konumuma git", zoom (01.7 `rgmv0`, `jKcQQ`). */
  mapControl: '0px 3px 10.5px rgba(16, 19, 24, 0.16)',
  /** Photo route markers on the map (01.7 `H3OjE`). */
  mapPin: '0px 3px 8.75px rgba(16, 19, 24, 0.28)',
  /** Persistent sheet over the map (01.7 `uwUKg`). */
  mapSheet: '0px -6px 24.5px rgba(16, 19, 24, 0.16)',
  /** Floating route preview card over the map (01.7 `SIrGF`). */
  mapCard: '0px 8px 24px rgba(16, 19, 24, 0.18)',
  /** A / B / stop markers on the route preview card and maps (04.1 "Pin / A"). */
  mapMarker: '0px 2px 6px rgba(16, 19, 24, 0.25)',
  /** Centered dialog card over a scrim ("Diyalog / Taslak kaydet", `zMCLP`). */
  dialog: '0px 12px 32px rgba(16, 19, 24, 0.25)',
} as const;
