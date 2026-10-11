/**
 * Pure size rules for photos before upload (no native module, so they can be checked in node).
 * `prepareImage` applies them on the device.
 */

/** How a kind of image is re-encoded: longest edge in px and JPEG quality (0–1). */
export type ImagePresetSpec = { maxEdge: number; quality: number };

export type ImagePreset = 'photo' | 'avatar' | 'screenshot';

export const IMAGE_PRESETS: Record<ImagePreset, ImagePresetSpec> = {
  // Ride, post and route suggestion photos: sharp full screen, ~0.5–1.2 MB.
  photo: { maxEdge: 2048, quality: 0.8 },
  // Shown at most ~120 pt; the transformer serves smaller sizes from this.
  avatar: { maxEdge: 1024, quality: 0.8 },
  // Feedback screenshots: text must stay readable.
  screenshot: { maxEdge: 1600, quality: 0.85 },
};

/** A file up to this size whose edges already fit needs no second encoding (see `rideUpload`). */
export const SMALL_IMAGE_BYTES = 1.5 * 1024 * 1024;

/**
 * The resize that brings the longest edge down to `maxEdge`, keeping the aspect ratio; only the
 * longer side is given (the manipulator computes the other). Null when the image already fits or
 * its size is unknown: images are never upscaled. The longest edge doesn't change with a 90°
 * rotation, so the stored (unrotated) size is enough to decide.
 */
export function fitLongestEdge(
  width: number,
  height: number,
  maxEdge: number,
): { width: number } | { height: number } | null {
  if (!(width > 0) || !(height > 0) || !(maxEdge > 0)) {
    return null;
  }
  if (Math.max(width, height) <= maxEdge) {
    return null;
  }
  return width >= height ? { width: Math.round(maxEdge) } : { height: Math.round(maxEdge) };
}

/** Whether a file of `bytes` is over the budget of an already prepared image. */
export const exceedsBudget = (bytes: number | null | undefined, maxBytes = SMALL_IMAGE_BYTES) =>
  bytes == null || !(bytes <= maxBytes);
