import { worldPoint } from '@/components/map/mapGeometry';
import { hasMapboxToken, mapboxToken } from '@/features/route-suggestion/services/mapboxConfig';
import type { Bounds } from '@/features/routes/types';
import { spacing } from '@/theme';

/** The area "Haritada keşfet" (07.01) opens on. */
export const EXPLORE_INITIAL_AREA: Bounds = { southWest: [29.35, 36.15], northEast: [30.95, 37.12] };

/** Header (07.01 "MapExploreSearchBar + CategoryChips"): 4 top, 44 search row, 8, 44 chip row. */
export const EXPLORE_HEADER_HEIGHT = 4 + 44 + spacing.sm + 44;
const HANDLE_HEIGHT = 8 + 4 + 12;
const TITLE_HEIGHT = 36;
const CHIPS_HEIGHT = 34;
const CARD_HEIGHT = 191;
/** The open route list sheet the map starts under. */
export const EXPLORE_SHEET_LIST_HEIGHT =
  HANDLE_HEIGHT + TITLE_HEIGHT + spacing.lg + CHIPS_HEIGHT + spacing.lg + CARD_HEIGHT + spacing.lg;
/** Mapbox Static Images API limit per side, in points. */
const MAX_SIDE = 1280;
const DEFAULT_STYLE = 'mapbox/outdoors-v12';

function staticStyleId() {
  const url = process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL;
  return url?.startsWith('mapbox://styles/') ? url.slice('mapbox://styles/'.length) : DEFAULT_STYLE;
}

type Screen = { width: number; height: number; insetTop: number; insetBottom: number };

/**
 * The first view of "Haritada keşfet" as a Mapbox Static Images picture of the whole screen:
 * the same bounds and padding its camera fits (between the header and the open sheet). The
 * Discover map card (05.01) shows this picture, so when the card grows into the explore map the
 * clone ends exactly on the live map's first frame. `focusY` is where the fitted area's centre
 * sits in the picture (the card crops around it). Null without a Mapbox token (Expo Go and
 * builds without one keep the design artwork).
 */
export function exploreInitialView({ width, height, insetTop, insetBottom }: Screen) {
  if (!hasMapboxToken) {
    return null;
  }
  const top = insetTop + EXPLORE_HEADER_HEIGHT;
  const bottom = EXPLORE_SHEET_LIST_HEIGHT + insetBottom;
  const sw = worldPoint(EXPLORE_INITIAL_AREA.southWest, 0);
  const ne = worldPoint(EXPLORE_INITIAL_AREA.northEast, 0);
  const zoom = Math.log2(
    Math.min(width / Math.abs(ne.x - sw.x), Math.max(height - top - bottom, 1) / Math.abs(sw.y - ne.y)),
  );
  const scale = 2 ** zoom;
  const areaCentreX = (sw.x + ne.x) / 2;
  const areaCentreY = (sw.y + ne.y) / 2;
  // The fitted area is centred between header and sheet; the picture is centred on the screen.
  const focusY = top + (height - top - bottom) / 2;
  const centreY = areaCentreY + (height / 2 - focusY) / scale;
  const lng = (areaCentreX / 512) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * centreY) / 512))) * 180) / Math.PI;
  const w = Math.min(Math.round(width), MAX_SIDE);
  const h = Math.min(Math.round(height), MAX_SIDE);
  const uri =
    `https://api.mapbox.com/styles/v1/${staticStyleId()}/static/` +
    `${lng.toFixed(6)},${lat.toFixed(6)},${zoom.toFixed(3)}/${w}x${h}@2x` +
    `?access_token=${mapboxToken}`;
  return { uri, focusY, width: w, height: h };
}
