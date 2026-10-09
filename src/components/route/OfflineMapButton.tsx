import { CloudCheck, CloudDownload } from 'iconoir-react-native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';

import { useToast } from '@/components/feedback/ToastProvider';
import { MapActionButton } from '@/components/map/MapActionButton';
import { haptics } from '@/features/haptics/haptics';
import { offlineMaps, offlineMapsSupported, useOfflineMap } from '@/features/offlineMaps/offlineMaps';
import type { Route } from '@/features/routes/types';
import { formatNumber } from '@/i18n/format';
import { showActionSheet } from '@/lib/showActionSheet';
import { colors } from '@/theme';

const RING = 22;
const STROKE = 2;

/** Download progress as a ring filling clockwise from the top, in the brand color. */
function ProgressRing({ progress }: { progress: number }) {
  const r = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
      <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.border} strokeWidth={STROKE} fill="none" />
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={colors.brand}
        strokeWidth={STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - Math.max(0.04, progress))}
        transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
      />
    </Svg>
  );
}

/**
 * Rota detayı top bar: the route's offline map (user decision 2026-10-09, not drawn; the top
 * bar's round map buttons). Cloud → download, ring → progress, cloud with a tick → ready (tap to
 * remove). Hidden where Mapbox can't run (Expo Go, web).
 */
export function OfflineMapButton({ route, toastBottomOffset }: { route: Route; toastBottomOffset?: number }) {
  const { t } = useTranslation('routeDetail');
  const { showToast } = useToast();
  const map = useOfflineMap(route.id);
  const state = map?.state;

  // The download finishing or failing is told once, while this screen is open.
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === 'downloading' && state === 'ready') {
      showToast({ variant: 'success', message: t('offline.ready'), bottomOffset: toastBottomOffset });
    } else if (previous.current === 'downloading' && state === 'failed') {
      showToast({ variant: 'failure', message: t('offline.failed'), bottomOffset: toastBottomOffset });
    }
    previous.current = state;
  }, [showToast, state, t, toastBottomOffset]);

  if (!offlineMapsSupported) {
    return null;
  }

  const percent = formatNumber(Math.round((map?.progress ?? 0) * 100));

  const onPress = () => {
    if (state === 'ready') {
      showActionSheet({
        title: t('offline.readyTitle'),
        options: [
          {
            label: t('offline.remove'),
            destructive: true,
            onPress: () => {
              haptics.press();
              offlineMaps.remove(route.id);
            },
          },
        ],
        cancelLabel: t('offline.cancel'),
      });
      return;
    }
    if (state === 'downloading') {
      showActionSheet({
        title: t('offline.downloadingTitle', { percent }),
        options: [{ label: t('offline.stop'), destructive: true, onPress: () => offlineMaps.remove(route.id) }],
        cancelLabel: t('offline.keepDownloading'),
      });
      return;
    }
    haptics.tap();
    offlineMaps.download(route);
  };

  return (
    <MapActionButton
      icon={state === 'ready' ? CloudCheck : CloudDownload}
      iconColor={state === 'ready' ? colors.brand : colors.textPrimary}
      content={state === 'downloading' ? <ProgressRing progress={map?.progress ?? 0} /> : undefined}
      selected={state === 'ready'}
      accessibilityLabel={
        state === 'ready'
          ? t('offline.readyA11y')
          : state === 'downloading'
            ? t('offline.downloadingA11y', { percent })
            : t('offline.download')
      }
      onPress={onPress}
    />
  );
}
