import type { SearchBoxOpenHours } from '@/features/search/mapboxSearchBox';

import type { OpeningState } from './types';

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/** Minutes since Monday 00:00 for a Search Box `{ day, time }` (day 0 = Monday, time "HHmm"). */
const weekMinute = ({ day, time }: { day: number; time: string }) =>
  day * MINUTES_PER_DAY + Number(time.slice(0, 2)) * 60 + Number(time.slice(2, 4));

/**
 * Opening state from Search Box weekly periods at `now` (device local time). A period that never
 * closes, or periods covering the whole week, mean "24 saat açık".
 */
export function openingStateFromPeriods(
  hours: SearchBoxOpenHours | undefined,
  now: Date,
): OpeningState | undefined {
  const periods = hours?.periods;
  if (!periods || periods.length === 0) {
    return undefined;
  }
  if (periods.some((period) => !period.close)) {
    return 'open24h';
  }
  const spans = periods.map((period) => {
    const start = weekMinute(period.open);
    const close = period.close!;
    let end = weekMinute(close);
    if (end <= start) {
      // Past midnight: the next day (some data repeats the opening day), or Sunday → Monday.
      end += close.day === period.open.day ? MINUTES_PER_DAY : MINUTES_PER_WEEK;
    }
    return { start, end };
  });
  const covered = spans.reduce((sum, span) => sum + (span.end - span.start), 0);
  // Back-to-back daily periods ("0000"–"2359") also mean always open.
  if (covered >= MINUTES_PER_WEEK - 7 * 2) {
    return 'open24h';
  }
  const minute =
    ((now.getDay() + 6) % 7) * MINUTES_PER_DAY + now.getHours() * 60 + now.getMinutes();
  const open = spans.some(
    ({ start, end }) =>
      (minute >= start && minute < end) ||
      (minute + MINUTES_PER_WEEK >= start && minute + MINUTES_PER_WEEK < end),
  );
  return open ? 'open' : 'closed';
}
