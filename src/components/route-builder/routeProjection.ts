import type { LngLat } from '@/features/routes/types';

export type ScreenPoint = { x: number; y: number };
export type BoxPadding = { top: number; right: number; bottom: number; left: number };

/**
 * Projects coordinates into a `width` × `height` box (equirectangular, longitude scaled by the
 * latitude so shapes keep their proportions), fitting `points` inside the padding and centring
 * them. A single point (or zero extent) lands in the middle of the padded area. `maxStretch` > 1
 * lets one axis scale up to that many times more than the other (schematic drawings only).
 */
export function createProjection(points: LngLat[], width: number, height: number, padding: BoxPadding, maxStretch = 1) {
  const innerWidth = Math.max(width - padding.left - padding.right, 1);
  const innerHeight = Math.max(height - padding.top - padding.bottom, 1);
  const centreX = padding.left + innerWidth / 2;
  const centreY = padding.top + innerHeight / 2;

  if (points.length === 0) {
    return (_point: LngLat): ScreenPoint => ({ x: centreX, y: centreY });
  }

  const lats = points.map(([, lat]) => lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lngScale = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map(([lng]) => lng * lngScale);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const fitX = spanX > 0 ? innerWidth / spanX : Infinity;
  const fitY = spanY > 0 ? innerHeight / spanY : Infinity;
  const uniform = spanX === 0 && spanY === 0 ? 0 : Math.min(fitX, fitY);
  // A schematic card may stretch the shorter axis a little so a north–south route in a wide,
  // short card doesn't collapse into a dot.
  const scaleX = Math.min(fitX, uniform * maxStretch);
  const scaleY = Math.min(fitY, uniform * maxStretch);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  return ([lng, lat]: LngLat): ScreenPoint => ({
    x: centreX + (lng * lngScale - midX) * (Number.isFinite(scaleX) ? scaleX : 0),
    // Screen y grows downwards, latitude upwards.
    y: centreY - (lat - midY) * (Number.isFinite(scaleY) ? scaleY : 0),
  });
}

/** SVG path data through the projected points. */
export const polylinePath = (points: ScreenPoint[]) =>
  points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
