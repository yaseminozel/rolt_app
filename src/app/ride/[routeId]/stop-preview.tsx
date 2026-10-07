import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { NavArrowLeft } from 'iconoir-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/feedback/ToastProvider';
import { MapActionButton } from '@/components/map/MapActionButton';
import { NavigationMapView } from '@/components/navigation/NavigationMapView';
import { StopDetourPanel } from '@/components/navigation/StopDetourPanel';
import { useRideSession } from '@/features/navigation/RideSessionProvider';
import { placeOnRoute, rideLine } from '@/features/navigation/ridePlan';
import { useStopDetour } from '@/features/navigation/useStopDetour';
import { formatApproxDuration, formatClockTime, formatDistance, formatNumber } from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { layout, spacing } from '@/theme';

/** Toasts above the Hazırlık "Başla" bar after returning there. */
const TOAST_OFFSET = 44 + spacing.lg * 2;

/**
 * 06.03 Rotayı sür / Durak önizleme (Pencil `oQwMi`): the picked place on the map, its position
 * on the route, the real detour (Sapma, Ek süre), the new total and "Durak olarak ekle", which
 * returns to Hazırlık with "Durak eklendi · Geri al".
 */
export default function StopPreviewScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const { t } = useTranslation(['ride', 'common']);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const session = useRideSession();
  const candidate = session.pendingStop;
  const detour = useStopDetour(candidate);
  const now = useNow();
  const line = useMemo(() => rideLine(session.route, session.reversed), [session.route, session.reversed]);

  if (!candidate) {
    return <Redirect href={{ pathname: '/ride/[routeId]/prepare', params: { routeId } }} />;
  }

  const placement = placeOnRoute(candidate.coordinates, line);
  const km = formatNumber(placement.alongM / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const subtitle = t(`addStop.placement.${placement.proximity}`, { km });
  const ready = detour.status === 'ready' ? detour : null;

  const add = () => {
    if (!ready) {
      return;
    }
    const previous = session.stops;
    const added = session.addStop({
      id: `${candidate.id}-${Date.now()}`,
      name: candidate.name,
      subtitle,
      coordinates: candidate.coordinates,
      detourMinutes: ready.extraMinutes,
    });
    session.setPendingStop(null);
    router.back();
    if (added) {
      showToast({
        variant: 'info',
        message: t('prepare.stopAdded'),
        actionLabel: t('common:actions.undo'),
        onActionPress: () => session.setStops(previous),
        bottomOffset: TOAST_OFFSET,
      });
    }
  };

  return (
    <View style={styles.screen}>
      <NavigationMapView
        line={session.plan?.geometry ?? line}
        stops={session.stops.map((stop) => ({ id: stop.id, coordinates: stop.coordinates }))}
        finish={line[line.length - 1]}
        pin={candidate.coordinates}
        camera={{ mode: 'point', center: candidate.coordinates, zoom: 14 }}
      />
      <View style={[styles.back, { top: insets.top + 7 }]}>
        <MapActionButton icon={NavArrowLeft} accessibilityLabel={t('preview.back')} onPress={() => router.back()} />
      </View>
      <View style={styles.panel}>
        <StopDetourPanel
          title={candidate.name}
          subtitle={subtitle}
          metrics={[
            {
              key: 'detour',
              label: t('preview.detour'),
              value: ready
                ? t('preview.detourDistance', {
                    value: formatNumber(ready.detourM / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                  })
                : null,
            },
            { key: 'time', label: t('preview.extraTime'), value: ready ? t('preview.detourMinutes', { value: ready.extraMinutes }) : null },
          ]}
          total={
            ready
              ? t('preview.newTotal', {
                  distance: formatDistance(ready.plan.distanceM / 1000, 1),
                  duration: formatApproxDuration(ready.plan.durationS / 60).replace(/^~/, ''),
                  time: formatClockTime(new Date(now + ready.plan.durationS * 1000)),
                })
              : detour.status === 'error'
                ? t('preview.error')
                : t('preview.calculating')
          }
          warning={ready?.large ? t('preview.largeDetour') : null}
          actionLabel={t('preview.addAsStop')}
          actionDisabled={!ready || !session.canAddStop}
          onAction={add}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  back: {
    position: 'absolute',
    left: layout.screenGutter,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
