import { Image, type ImageProps } from 'expo-image';

/**
 * Onboarding art image. The scenes are scaled up to the screen width (× 1.09 on 430 pt
 * phones), so the 4x exports are decoded at full size instead of being downscaled to the
 * view's 3x size first, which would leave the upscaled art soft.
 */
export function DesignImage(props: ImageProps) {
  return <Image allowDownscaling={false} {...props} />;
}
