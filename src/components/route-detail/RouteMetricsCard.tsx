import { useTranslation } from 'react-i18next';

import type { Route } from '@/features/routes/types';
import { formatDistance, formatDuration, formatNumber, formatSpeed } from '@/i18n/format';

import { MetricsCard, type MetricItem } from './MetricsCard';

/**
 * "Sürüş metrikleri" (05.04 `d8jZLT`): two always-visible rows — distance, duration, average
 * speed, then max speed, bends and breaks. Values use the JetBrains Mono metric face (CLAUDE.md).
 */
export function RouteMetricsCard({ route }: { route: Route }) {
  const { t } = useTranslation('routeDetail');

  const rows: MetricItem[][] = [
    [
      { key: 'distance', value: formatDistance(route.distanceKm, 1), label: t('metrics.distance') },
      {
        key: 'duration',
        value: formatDuration(route.durationMinutes),
        label: t('metrics.duration'),
      },
      {
        key: 'averageSpeed',
        value: formatSpeed(route.averageSpeedKmh),
        label: t('metrics.averageSpeed'),
      },
    ],
    [
      { key: 'maxSpeed', value: formatSpeed(route.maxSpeedKmh), label: t('metrics.maxSpeed') },
      { key: 'curves', value: formatNumber(route.curveCount), label: t('metrics.curves') },
      { key: 'breaks', value: formatNumber(route.breakCount), label: t('metrics.breaks') },
    ],
  ];

  return <MetricsCard rows={rows} />;
}
