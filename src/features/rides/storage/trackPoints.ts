import type { LngLat } from '@/features/routes/types';

import type { TrackPoint } from '../rideRecorder';

/** Points back into the record's segments; empty segments (a pause with no points) don't return. */
export function segmentsFromPoints(points: { segment: number; coordinates: LngLat }[]): LngLat[][] {
  const segments: LngLat[][] = [];
  let current = Number.NaN;
  for (const point of points) {
    if (point.segment !== current) {
      segments.push([]);
      current = point.segment;
    }
    segments[segments.length - 1].push(point.coordinates);
  }
  return segments;
}

/** A track as points, `seq` from 0 (a ride stored whole being continued). */
export function pointsFromSegments(track: LngLat[][]): TrackPoint[] {
  const points: TrackPoint[] = [];
  track.forEach((segment, index) =>
    segment.forEach((coordinates) => points.push({ seq: points.length, segment: index, coordinates })),
  );
  return points;
}
