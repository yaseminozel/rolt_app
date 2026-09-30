import type { SvgProps } from 'react-native-svg';

import { SocialProviderIcon } from '@/components/brand';

/** Official marks render at the design's 24 pt (00.1 "Left icon"), not the Button's 20 pt glyph size. */
const MARK_SIZE = 24;

/**
 * Adapters for `Button`'s `icon` slot, which expects an SVG icon component. The size and
 * color the button passes are ignored: brand marks keep their official colors and size.
 */
export function GoogleMark(_props: SvgProps) {
  return <SocialProviderIcon provider="google" size={MARK_SIZE} />;
}

export function AppleMark(_props: SvgProps) {
  return <SocialProviderIcon provider="apple" size={MARK_SIZE} />;
}
