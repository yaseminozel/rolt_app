import type { TFunction } from 'i18next';

import { formatNumber } from '@/i18n/format';

import type { ManeuverModifier, NavigationStep } from './types';

/** Closer than this, the instruction drops "… sonra" and reads as "Sağa dön". */
const IMMEDIATE_M = 25;

/** Guidance distance: metres rounded to 10 under a kilometre ("350 m"), one decimal above ("1,2 km"). */
export function formatGuidanceDistance(metres: number, t: TFunction<'ride'>) {
  if (metres < 1000) {
    return t('units.metres', { value: formatNumber(Math.max(10, Math.round(metres / 10) * 10)) });
  }
  return t('units.kilometres', { value: formatNumber(metres / 1000, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) });
}

/** Distance to a stop or the finish: one decimal in km ("0,9 km", "3,1 km"). */
export function formatStopDistance(metres: number, t: TFunction<'ride'>) {
  return t('units.kilometres', {
    value: formatNumber(metres / 1000, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
  });
}

/** Which action word a step uses (`ride:maneuver.action.*` / `ride:maneuver.now.*`). */
export function maneuverAction(step: NavigationStep): string {
  switch (step.type) {
    case 'turn':
    case 'endOfRoad':
    case 'fork':
    case 'merge':
      return step.modifier ?? 'straight';
    case 'roundabout':
      return 'roundabout';
    case 'arrive':
      return 'arrive';
    case 'depart':
    case 'continue':
      return step.modifier && step.modifier !== 'straight' ? step.modifier : 'straight';
  }
}

/** Icon family for the maneuver card (06.06 "Manevra ikonu"). */
export function maneuverIconKind(step: NavigationStep | null): ManeuverModifier | 'roundabout' | 'arrive' {
  if (!step) {
    return 'straight';
  }
  const action = maneuverAction(step);
  return action as ManeuverModifier | 'roundabout' | 'arrive';
}

type InstructionContext = {
  /** 1-based number of the stop this step arrives at; `null` for the finish. */
  stopNumber: number | null;
};

/**
 * Card title for the upcoming maneuver: "350 m sonra sağa dön", "Sağa dön" when close,
 * "350 m sonra 1. durak", "350 m sonra varış noktası" (stops and finish have their own lines).
 */
export function maneuverTitle(
  step: NavigationStep,
  distance: number,
  t: TFunction<'ride'>,
  { stopNumber }: InstructionContext,
) {
  const action = maneuverAction(step);
  const immediate = distance < IMMEDIATE_M;
  if (action === 'arrive') {
    const formatted = formatGuidanceDistance(distance, t);
    if (stopNumber !== null) {
      return immediate
        ? t('maneuver.arrivingStopNow', { number: stopNumber })
        : t('maneuver.arrivingStop', { distance: formatted, number: stopNumber });
    }
    return immediate ? t('maneuver.arrivingFinishNow') : t('maneuver.arrivingFinish', { distance: formatted });
  }
  if (action === 'roundabout') {
    const words = step.exit
      ? t('maneuver.roundaboutExit', { exit: step.exit })
      : t('maneuver.roundabout');
    return immediate ? capitalize(words) : t('maneuver.after', { distance: formatGuidanceDistance(distance, t), action: words });
  }
  return immediate
    ? t(`maneuver.now.${action as ManeuverModifier}`)
    : t('maneuver.after', {
        distance: formatGuidanceDistance(distance, t),
        action: t(`maneuver.action.${action as ManeuverModifier}`),
      });
}

/** Card second line: "746. Sk yönünde ilerle", or "Rotayı takip et" for unnamed roads. */
export function maneuverSubtitle(step: NavigationStep | null, t: TFunction<'ride'>) {
  return step?.streetName ? t('maneuver.towards', { street: step.streetName }) : t('maneuver.followRoute');
}

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}
