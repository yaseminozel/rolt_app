import type { PreparedImage, PrepareImageOptions } from './prepareImage';
import type { ImagePreset } from './imageSizing';

export type { PreparedImage, PrepareImageOptions } from './prepareImage';
export type { ImagePreset } from './imageSizing';

/** Web preview: picked images are blob / data uris and go as they are. */
export const prepareImage = async (
  uri: string,
  _preset?: ImagePreset,
  _options?: PrepareImageOptions,
): Promise<PreparedImage> => ({ uri, temporary: false });

export function discardPreparedImage(_image: PreparedImage) {}
