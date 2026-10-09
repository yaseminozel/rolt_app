import { currentUserId, supabase } from '@/lib/supabase/client';

import type { RoutePhoto, SubmissionProgress, SubmissionStep } from '../types';
import { supabasePhotoUploader } from './supabasePhotoUploader';
import { SubmissionError, type RouteSuggestionSubmitter } from './types';

/** Short codes on 04.6 ("Sunucuya ulaşılamıyor · RT-503"). */
const NETWORK_CODE = 'RT-503';
const SERVER_CODE = 'RT-500';
/** Not signed in, or the email isn't confirmed yet (`is_verified()` in the RPC). */
const NOT_ALLOWED_CODE = 'RT-403';
/** The draft has no calculated line (shouldn't happen: 04.1 requires it). */
const INVALID_CODE = 'RT-422';

/** Share of the overall progress before / during the photo uploads (the rest is review). */
const PHOTOS_START = 0.3;
const PHOTOS_SHARE = 0.6;

const isNetworkMessage = (message: string) =>
  /network|fetch|timeout|timed out|offline|abort/i.test(message);

/** The gateway answers but the service behind it is down: as unreachable as no connection. */
const isUnavailable = (status: number) => status === 502 || status === 503 || status === 504;

/** A failed photo upload (`uploadFile` rejects with "Upload failed (status): …" or a network error). */
function uploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = Number(message.match(/\((\d{3})\)/)?.[1]);
  if (status >= 400 && status < 500) {
    return new SubmissionError(status === 401 || status === 403 ? NOT_ALLOWED_CODE : `RT-${status}`, 'server');
  }
  if (isUnavailable(status)) {
    return new SubmissionError(NETWORK_CODE, 'network');
  }
  if (status >= 500) {
    return new SubmissionError(SERVER_CODE, 'server');
  }
  return isNetworkMessage(message)
    ? new SubmissionError(NETWORK_CODE, 'network')
    : new SubmissionError(SERVER_CODE, 'server');
}

/** A failed RPC: PostgREST reports a failed fetch with status 0 and no SQL state. */
function rpcError(status: number, error: { message: string; code?: string }) {
  if (status === 0 || isUnavailable(status) || (!error.code && isNetworkMessage(error.message))) {
    return new SubmissionError(NETWORK_CODE, 'network');
  }
  if (error.code === '42501' || status === 401 || status === 403) {
    return new SubmissionError(NOT_ALLOWED_CODE, 'server');
  }
  return new SubmissionError(SERVER_CODE, 'server');
}

/**
 * Rota öner on Supabase (04.4): uploads any photo that isn't stored yet (normally all are, they
 * upload as soon as they are added), then `submit_route_suggestion` with the line as GeoJSON,
 * the waypoints, metrics and the photo paths (cover first). Failures become `SubmissionError`.
 */
export const supabaseSubmitter: RouteSuggestionSubmitter = {
  async submit(draft, onProgress) {
    const totalPhotos = draft.photos.length;
    const report = (step: SubmissionStep, fraction: number, uploadedPhotos = 0) =>
      onProgress({ step, fraction, uploadedPhotos, totalPhotos } satisfies SubmissionProgress);

    report('validateLine', 0.1);
    const { preview } = draft;
    if (!preview || preview.geometry.length < 2) {
      throw new SubmissionError(INVALID_CODE, 'server');
    }
    if (!(await currentUserId())) {
      throw new SubmissionError(NOT_ALLOWED_CODE, 'server');
    }

    report('uploadDetails', 0.2);
    const waypoints = draft.waypoints.flatMap((waypoint) =>
      waypoint.place ? [{ kind: waypoint.kind, place: waypoint.place }] : [],
    );

    const paths: string[] = [];
    const uploadMissing = async (photo: RoutePhoto, index: number) => {
      if (photo.storagePath) {
        return photo.storagePath;
      }
      try {
        return await supabasePhotoUploader.upload(photo.uri, {
          isRetry: true,
          onProgress: (fraction) =>
            report(
              'uploadPhotos',
              PHOTOS_START + (PHOTOS_SHARE * (index + fraction)) / totalPhotos,
              index,
            ),
        });
      } catch (error) {
        throw uploadError(error);
      }
    };
    report('uploadPhotos', PHOTOS_START, 0);
    for (const [index, photo] of draft.photos.entries()) {
      paths.push(await uploadMissing(photo, index));
      report('uploadPhotos', PHOTOS_START + (PHOTOS_SHARE * (index + 1)) / totalPhotos, index + 1);
    }

    report('sendToReview', 0.95, totalPhotos);
    const { data, error, status } = await supabase.rpc('submit_route_suggestion', {
      p_name: draft.name.trim(),
      p_tags: draft.tags,
      p_difficulty: draft.difficulty ?? 'moderate',
      p_description: draft.description.trim(),
      p_waypoints: waypoints,
      p_path: { type: 'LineString', coordinates: preview.geometry },
      p_distance_km: preview.distanceKm,
      // Integer columns; routing reports fractional minutes.
      p_duration_minutes: Math.round(preview.durationMinutes),
      // Unknown climb stays null (the generated type can't express a nullable argument).
      p_elevation_gain_m:
        preview.elevationGainM === undefined
          ? (null as unknown as number)
          : Math.round(preview.elevationGainM),
      p_photo_paths: paths,
    });
    if (error) {
      throw rpcError(status, error);
    }
    const result = data as { trackingId: string; submittedAt: string } | null;
    if (!result?.trackingId) {
      throw new SubmissionError(SERVER_CODE, 'server');
    }
    return { trackingId: result.trackingId, submittedAt: result.submittedAt };
  },
};
