import type { LngLat } from '@/features/routes/types';

import type { TrackPoint } from './rideRecorder';

/**
 * How the live track reaches the map (CLAUDE.md "Uzun sürüş performansı"): sending the whole
 * line on every fix grew to ~260 KB of GeoJSON per update after three hours. Instead the map
 * gets a `committed` part, simplified for display and rebuilt only every `commitIntervalMs` (or
 * when a new segment starts), and a short live `tail` of the points since. Storage always keeps
 * the full track; simplification is for drawing only.
 */
export const TRACK_VIEW_RULES = {
  commitIntervalMs: 10_000,
  /** Douglas–Peucker tolerance; at riding zooms (15.5–16.5) a few metres don't show. */
  toleranceM: 4,
} as const;

export type TrackViewState = {
  committed: LngLat[][];
  /** Bumped on every commit, so the map rebuilds the committed shape only then. */
  commits: number;
  /** Points after the committed part, starting with its last point (no gap at the join). */
  tail: LngLat[];
};

const METERS_PER_DEGREE = 111_320;

/** Douglas–Peucker in metres (local equirectangular projection); keeps both ends. */
export function simplifyLine(points: LngLat[], toleranceM: number): LngLat[] {
  if (points.length <= 2) {
    return [...points];
  }
  const cos = Math.cos((points[0][1] * Math.PI) / 180);
  const xy = points.map(([lng, lat]) => [lng * METERS_PER_DEGREE * cos, lat * METERS_PER_DEGREE]);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  const toleranceSq = toleranceM * toleranceM;
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    const [ax, ay] = xy[first];
    const [bx, by] = xy[last];
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    let farthest = -1;
    let farthestSq = toleranceSq;
    for (let index = first + 1; index < last; index += 1) {
      const [px, py] = xy[index];
      const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
      const ex = px - (ax + t * dx);
      const ey = py - (ay + t * dy);
      const distanceSq = ex * ex + ey * ey;
      if (distanceSq > farthestSq) {
        farthestSq = distanceSq;
        farthest = index;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1;
      stack.push([first, farthest], [farthest, last]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

/** Incremental display track of one recording; feed it the recorder's new points. */
export class TrackView {
  private committed: LngLat[][] = [];
  /** Recorder segment index of the last committed segment. */
  private committedSegment = -1;
  /** Next `seq` not yet committed. */
  private committedSeq = 0;
  private lastCommitAt = -Infinity;
  private commits = 0;
  private state: TrackViewState = { committed: [], commits: 0, tail: [] };

  /**
   * `pointsSince` is the recorder's; returns the same state object while nothing changed, so it
   * can go straight into React state.
   */
  update(pointsSince: (seq: number) => TrackPoint[], now: number): TrackViewState {
    const fresh = pointsSince(this.committedSeq);
    if (fresh.length === 0) {
      return this.state;
    }
    const newSegment = fresh.some((point) => point.segment !== this.committedSegment);
    if (newSegment || now - this.lastCommitAt >= TRACK_VIEW_RULES.commitIntervalMs) {
      this.commit(fresh, now);
      this.state = { committed: this.committed, commits: this.commits, tail: [] };
      return this.state;
    }
    const join = this.committed[this.committed.length - 1];
    this.state = {
      committed: this.committed,
      commits: this.commits,
      tail: [...(join ? [join[join.length - 1]] : []), ...fresh.map((point) => point.coordinates)],
    };
    return this.state;
  }

  private commit(fresh: TrackPoint[], now: number) {
    let index = 0;
    while (index < fresh.length) {
      const segment = fresh[index].segment;
      const group: LngLat[] = [];
      while (index < fresh.length && fresh[index].segment === segment) {
        group.push(fresh[index].coordinates);
        index += 1;
      }
      if (segment === this.committedSegment && this.committed.length > 0) {
        // Continue the last committed line from its end point, so the chunks join seamlessly.
        const line = this.committed[this.committed.length - 1];
        const chunk = simplifyLine([line[line.length - 1], ...group], TRACK_VIEW_RULES.toleranceM);
        this.committed = [...this.committed.slice(0, -1), [...line, ...chunk.slice(1)]];
      } else {
        this.committed = [...this.committed, simplifyLine(group, TRACK_VIEW_RULES.toleranceM)];
        this.committedSegment = segment;
      }
    }
    this.committedSeq = fresh[fresh.length - 1].seq + 1;
    this.lastCommitAt = now;
    this.commits += 1;
  }
}
