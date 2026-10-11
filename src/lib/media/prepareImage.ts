import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { exceedsBudget, fitLongestEdge, IMAGE_PRESETS, type ImagePreset } from './imageSizing';

export type { ImagePreset } from './imageSizing';

export type PreparedImage = {
  /** A new `.jpg` in the cache, or the original uri when nothing was done (or it failed). */
  uri: string;
  /** True for a file this call wrote: move it somewhere or `discardPreparedImage` it. */
  temporary: boolean;
};

export type PrepareImageOptions = {
  /**
   * Leave a JPEG that already fits the budget as it is (no second encoding). Only for files the
   * app prepared before: an untouched camera file would keep its EXIF / GPS metadata.
   */
  skipWhenSmall?: boolean;
};

const isJpeg = (uri: string) => /\.jpe?g$/i.test(uri.split('?')[0]);

function fileSize(uri: string) {
  try {
    const file = new File(uri);
    return file.exists ? file.size : null;
  } catch {
    return null;
  }
}

/**
 * One image at a time: a 12 MP photo is ~48 MB decoded, and picking 10 at once would otherwise
 * decode them all together.
 */
let queue: Promise<unknown> = Promise.resolve();

function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Re-encodes a picked or captured image before it is kept or uploaded: the longest edge comes down
 * to the preset's size (never up), the pixels are turned upright (iOS fixes the orientation on
 * load, Android's loader applies the EXIF rotation) and the result is a JPEG without metadata, so
 * a photo never carries the rider's location in its EXIF. Camera originals of 3–6 MB end up
 * around 0.5–1.2 MB. Any failure resolves with the original file: a photo is never lost over this.
 */
export async function prepareImage(
  uri: string,
  preset: ImagePreset = 'photo',
  { skipWhenSmall = false }: PrepareImageOptions = {},
): Promise<PreparedImage> {
  if (/^https?:/i.test(uri)) {
    return { uri, temporary: false };
  }
  if (skipWhenSmall && isJpeg(uri) && !exceedsBudget(fileSize(uri))) {
    return { uri, temporary: false };
  }
  return oneAtATime(() => encode(uri, preset));
}

async function encode(uri: string, preset: ImagePreset): Promise<PreparedImage> {
  const original: PreparedImage = { uri, temporary: false };
  const { maxEdge, quality } = IMAGE_PRESETS[preset];
  // Contexts and images hold full-size native bitmaps until released.
  const native: { release(): void }[] = [];
  try {
    const loading = ImageManipulator.manipulate(uri);
    native.push(loading);
    let image = await loading.renderAsync();
    native.push(image);
    const resize = fitLongestEdge(image.width, image.height, maxEdge);
    if (resize) {
      const resizing = ImageManipulator.manipulate(image).resize(resize);
      native.push(resizing);
      image = await resizing.renderAsync();
      native.push(image);
    }
    const saved = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
    return { uri: saved.uri, temporary: true };
  } catch (error) {
    if (__DEV__) {
      console.warn('image preparation failed, using the original', error);
    }
    return original;
  } finally {
    native.reverse().forEach((object) => {
      try {
        object.release();
      } catch {
        // Already released.
      }
    });
  }
}

/** Deletes a file `prepareImage` wrote (best effort; originals are left alone). */
export function discardPreparedImage(image: PreparedImage) {
  if (!image.temporary) {
    return;
  }
  try {
    const file = new File(image.uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // The cache folder is the system's to clear.
  }
}
