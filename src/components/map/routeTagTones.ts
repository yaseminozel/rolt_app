import type { RouteTag } from '@/features/routes/types';
import { colors } from '@/theme';

type RouteTagTone = {
  /** Route line on "Haritada Keşfet" and the tag label colour. */
  ink: string;
  /** Tag pill background on the route preview card. */
  surface: string;
};

/**
 * One colour per route tag so a line on the map and its tag pill read as the same route.
 * Design (01.7 `eMAqs`): Sahil `#0E7490`, Virajlı `#B45309`, Manzara `#15803D`, i.e. the
 * ride-type badge tones (a2e36). Şehir İçi, Doğa and Off-road are not drawn in the design:
 * Şehir İçi and Off-road reuse their ride-type badge tones; Doğa takes the info blue because
 * green already means Manzara on the map.
 */
export const routeTagTones: Record<RouteTag, RouteTagTone> = {
  coast: { ink: colors.rideCoastText, surface: colors.rideCoastSurface },
  curvy: { ink: colors.warning, surface: colors.warningSurface },
  scenic: { ink: colors.success, surface: colors.successSurface },
  city: { ink: colors.rideCityText, surface: colors.surfaceMuted },
  nature: { ink: colors.info, surface: colors.infoSurface },
  offRoad: { ink: colors.rideOffRoadText, surface: colors.rideOffRoadSurface },
  // Not drawn in the design; the ROLT accent teal keeps it distinct from the other lines.
  longTour: { ink: colors.accentStrong, surface: colors.accentSubtle },
};
