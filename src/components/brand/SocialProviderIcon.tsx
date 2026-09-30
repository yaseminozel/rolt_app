import Svg, { G, Path } from 'react-native-svg';

export type SocialProvider = 'google' | 'apple';

type SocialProviderIconProps = {
  provider: SocialProvider;
  /** Rendered width and height; the 24 × 24 artwork scales proportionally. */
  size?: number;
};

const providerNames: Record<SocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
};

/** `Brand / Google / Official` — Pencil `Q8Xitg` (paths `J5A2AW`, `EsYwy`, `Yn4Zt`, `DXfPS`). */
function GoogleArtwork() {
  return (
    <G>
      <G transform="translate(12 10)">
        <Path
          d="M11.49 2.27c0-0.79-0.07-1.54-0.2-2.27l-11.29 0 0 4.51 6.47 0c-0.13375 0.73592-0.41541 1.43706-0.82793 2.061-0.41252 0.62394-0.94733 1.1577-1.57207 1.569l0 3.02 3.89 0c2.28-2.1 3.53-5.2 3.53-8.89z"
          fill="#4285f4"
        />
      </G>
      <G transform="translate(1.27 14.26)">
        <Path
          d="M10.73 9.74c3.24 0 5.95-1.07 7.93-2.91l-3.89-3.02c-1.07 0.72-2.45 1.15-4.04 1.15-3.12 0-5.76-2.11-6.71-4.96l-4.02 0 0 3.11c0.99596 1.99288 2.52747 3.66886 4.42275 4.83994 1.89528 1.17108 4.07936 1.79094 6.30725 1.79006z"
          fill="#34a853"
        />
      </G>
      <G transform="translate(0 6.63)">
        <Path
          d="M5.29 7.63c-0.24618-0.7283-0.37446-1.49124-0.38-2.26 0-0.79 0.14-1.55 0.38-2.26l0-3.11-4.02 0c-0.83473 1.66704-1.26956 3.50565-1.27 5.37 0 1.94 0.46 3.78 1.27 5.37l4.02-3.11z"
          fill="#fbbc05"
        />
      </G>
      <G transform="translate(1.27 0)">
        <Path
          d="M10.73 4.77c1.77 0 3.35 0.61 4.6 1.8l3.45-3.45c-2.1-1.93-4.81-3.12-8.05-3.12-2.22789-0.00089-4.41197 0.61898-6.30725 1.79006-1.89528 1.17108-3.42679 2.84706-4.42275 4.83994l4.02 3.11c0.95-2.85 3.59-4.97 6.71-4.97z"
          fill="#ea4335"
        />
      </G>
    </G>
  );
}

/** `Brand / Apple / Official` — Pencil `ZD4Th` (path `n4v0rx`). */
function AppleArtwork() {
  return (
    <G transform="translate(4.412922 2.77)">
      <Path
        d="M12.63708 17.51c-0.98 0.95-2.05 0.8-3.08 0.35-1.09-0.46-2.09-0.48-3.24 0-1.44 0.62-2.2 0.44-3.06-0.35-4.88-5.03-4.16-12.69 1.38-12.97 1.22-0.07 2.12 0.67 2.86 0.67 0.71 0 2.04-0.91 3.44-0.78 0.59 0.02 2.27 0.24 3.34 1.82-0.09 0.05-2 1.16-1.98 3.49 0.03 2.79 2.43 3.72 2.46 3.73-0.02 0.07-0.38 1.25-1.27 2.47-0.77 1.05-1.57 2.09-2.85 2.07l2-0.5z m-1.78-14.56c0.65-0.78 1.09-1.87 0.97-2.95-0.93 0.04-2.06 0.62-2.72 1.4-0.59 0.68-1.11 1.78-0.97 2.83 1.04 0.08 2.1-0.53 2.72-1.28z"
        fill="#000000"
      />
    </G>
  );
}

/** Official Google / Apple sign-in marks, 24 × 24. Pencil nodes `Q8Xitg`, `ZD4Th`. */
export function SocialProviderIcon({ provider, size = 24 }: SocialProviderIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible
      accessibilityRole="image"
      accessibilityLabel={providerNames[provider]}>
      {provider === 'google' ? <GoogleArtwork /> : <AppleArtwork />}
    </Svg>
  );
}
