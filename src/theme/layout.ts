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
  /** Filter chips (iCyEV) and large badges (YFU4m); also list selection backgrounds and route row thumbnails. */
  chip: 10,
  md: 12,
  lg: 16,
  /** Ride type option tile (N0mch). */
  tile: 18,
  /** Map and status cards (AreaMapCard, RouteStatusCard). */
  media: 20,
  xl: 24,
  /** ROLT logo tile on the share onboarding page (bblG8 `W7NIJ`). */
  appTile: 28,
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
  /** Maneuver card and floating banners in navigation (06.06 "Yönlendirme kartı"). */
  guidance: '0px 8px 21px rgba(15, 23, 41, 0.12)',
  /** Small pills over the navigation map ("Sonraki durak", "Mola"). */
  floatingPill: '0px 4px 12.25px rgba(0, 0, 0, 0.15)',
  /** Persistent bottom panels over the navigation map ("Önizleme", "Rota tamamlandı"). */
  bottomPanel: '0px -4px 17.5px rgba(0, 0, 0, 0.12)',
  subtle: '0px 1px 1.75px rgba(16, 19, 24, 0.22)',
  raised: '0px 2px 5.25px rgba(8, 18, 23, 0.16)',
  floating: '0px 4px 14px rgba(0, 0, 0, 0.12)',
  overlay: '0px 3px 10.5px rgba(0, 0, 0, 0.14)',
  /** Floating pill on the Discover map card ("Bu bölgede N rota var", oxSGl). */
  mapPill: '0px 2px 8.75px rgba(0, 0, 0, 0.12)',
  /** Profile "+" menu card (09.01 `niGQX`). */
  menu: '0px 12px 32px rgba(16, 19, 24, 0.15)',
  /** Front card of the stacked empty-state picture ("Kart / Motor — silüet (ön)"). */
  stackFront: '0px 4px 12px rgba(16, 19, 24, 0.1)',
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
  /** Back button and search field over the explore map (07.01 "Back", "Field"). */
  mapField: '0px 2px 7px rgba(15, 18, 23, 0.16)',
  /** Category chips over the explore map (07.01 "Chip / Rotalar"). */
  mapChip: '0px 2px 5.25px rgba(15, 18, 23, 0.14)',
  /** 52 pt map buttons "Konumum" and "Katmanlar" (07.01 "Harita kontrolleri"). */
  mapFab: '0px 4px 12.25px rgba(15, 18, 23, 0.14)',
  /** Route cluster badge (07.01 "Route cluster" `Badge`). */
  mapCluster: '0px 3px 7px rgba(15, 18, 23, 0.22)',
  /** Start dot, finish pin, their tags and the other routes' clusters (07.01 "Rota seçili"). */
  mapLabel: '0px 2px 5.25px rgba(0, 0, 0, 0.2)',
  /** Status line over the record map (08.01–08.04 "Badge / Tag"). */
  statusBanner: '0px 4px 3.5px rgba(167, 167, 167, 0.25)',
  /** QR profile card (09.02 "Kart / Karekod"). */
  qrCard: '0px 12px 28px rgba(16, 19, 24, 0.12), 2px 2px 7.7px rgba(16, 19, 24, 0.06)',
  /** Brand-tinted glow under the ROLT logo tile (bblG8 `W7NIJ`). */
  brandGlow: '0px 10px 21px rgba(20, 20, 255, 0.28)',
  /** Centered dialog card over a scrim ("Diyalog / Taslak kaydet", `zMCLP`). */
  dialog: '0px 12px 32px rgba(16, 19, 24, 0.25)',
} as const;
