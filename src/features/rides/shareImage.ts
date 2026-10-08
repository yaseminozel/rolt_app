import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';

/** Share pictures are story-sized (9:16). */
export const SHARE_IMAGE_SIZE = { width: 1080, height: 1920 };

/**
 * Captures a rendered share template and opens the system share sheet with the PNG (09.03).
 * Instagram, WhatsApp and the others pick it up there; transparent templates keep their alpha
 * for story stickers. Web has no file sharing, so it falls back to the text message.
 */
export async function shareTemplateImage(ref: RefObject<View | null>, fallbackMessage: string) {
  if (Platform.OS === 'web' || !ref.current) {
    await Share.share({ message: fallbackMessage });
    return;
  }
  const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: SHARE_IMAGE_SIZE.width,
    height: SHARE_IMAGE_SIZE.height,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
  } else {
    await Share.share({ url: uri, message: fallbackMessage });
  }
}
