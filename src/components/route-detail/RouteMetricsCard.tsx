import { useTranslation } from 'react-i18next';

import type { Route } from '@/features/routes/types';
import { formatDistance, formatDuration, formatNumber } from '@/i18n/format';

import { MetricsCard, type MetricItem } from './MetricsCard';

/**
 * "Sürüş metrikleri" (05.04 `1083:18408`): one row — distance, duration and breaks. Values use
 * the JetBrains Mono metric face (CLAUDE.md).
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
      { key: 'breaks', value: formatNumber(route.breakCount), label: t('metrics.breaks') },
    ],
  ];

  return <MetricsCard rows={rows} />;
}
