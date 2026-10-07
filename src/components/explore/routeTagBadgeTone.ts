import type { BadgeTone } from '@/components/ui/Badge';
import type { RouteTag } from '@/features/routes/types';

/**
 * Tag badge tone on "Haritada Keşfet" (07.01): Sahil green, Virajlı blue, Manzara amber as
 * drawn; the tags the design doesn't draw stay neutral so they don't borrow another tag's colour.
 */
export const routeTagBadgeTone: Record<RouteTag, BadgeTone> = {
  coast: 'success',
  curvy: 'info',
  scenic: 'warning',
  city: 'neutral',
  nature: 'neutral',
  offRoad: 'neutral',
  longTour: 'neutral',
};
