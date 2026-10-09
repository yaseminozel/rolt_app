import type { TFunction } from 'i18next';
import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  averageFixIntervalMs,
  gpsDiagnostics,
  type GpsLogEntry,
} from '@/features/navigation/gpsDiagnostics';
import { i18n } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { useNow } from '@/lib/useNow';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme';

const PILL_HEIGHT = 28;
const PANEL_WIDTH = 264;
const LOG_HEIGHT = 156;

type GpsDevPanelProps = {
  /** Where the pill sits (absolute position over the screen). */
  style?: StyleProp<ViewStyle>;
  /** The panel opens above the pill instead of below it. */
  opensUpward?: boolean;
};

/**
 * Developer GPS panel (development builds only, never in production): a small "GPS" pill that
 * opens accuracy, fix timing, GPS speed, health, source and power mode, with the latest state
 * changes. Closed by default so it doesn't cover the screen.
 */
export function GpsDevPanel({ style, opensUpward = false }: GpsDevPanelProps) {
  const { t } = useTranslation('rides');
  const [open, setOpen] = useState(false);
  if (!__DEV__) {
    return null;
  }
  return (
    <View
      style={[styles.container, opensUpward && styles.upward, style]}
      pointerEvents="box-none">
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={t('dev.toggleA11y')}
        accessibilityState={{ expanded: open }}
        hitSlop={(layout.minTouchTarget - PILL_HEIGHT) / 2}
        style={[styles.pill, open && styles.pillOpen]}>
        <Text style={styles.pillLabel}>{t('dev.toggle')}</Text>
      </Pressable>
      {open ? <GpsDevDetails /> : null}
    </View>
  );
}

function GpsDevDetails() {
  const { t } = useTranslation('rides');
  const state = useSyncExternalStore(gpsDiagnostics.subscribe, gpsDiagnostics.getSnapshot);
  const now = useNow(1_000);
  const lastFix = state.fixes[state.fixes.length - 1] ?? null;
  const intervalMs = averageFixIntervalMs(state.fixes);
  const none = t('dev.none');
  const seconds = (ms: number) =>
    t('dev.seconds', {
      value: formatNumber(ms / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    });

  const health = state.health;
  let healthText = none;
  if (health) {
    healthText = `${t(`dev.healthStates.${health.state}`)} · ${t(
      health.moving ? 'dev.motion.moving' : 'dev.motion.standing',
    )}`;
    if (health.weakInMs !== null) {
      healthText += ` · ${t('dev.weakIn', {
        seconds: formatNumber(Math.ceil(health.weakInMs / 1000)),
      })}`;
    }
  }

  const rows = [
    {
      key: 'accuracy',
      label: t('dev.accuracy'),
      value:
        lastFix && Number.isFinite(lastFix.accuracyM)
          ? t('dev.metres', { value: formatNumber(Math.round(lastFix.accuracyM)) })
          : none,
    },
    {
      key: 'sinceLastFix',
      label: t('dev.sinceLastFix'),
      value: lastFix ? seconds(Math.max(0, now - lastFix.at)) : none,
    },
    { key: 'interval', label: t('dev.interval'), value: intervalMs === null ? none : seconds(intervalMs) },
    {
      key: 'speed',
      label: t('dev.speed'),
      value:
        lastFix && lastFix.speedMps !== null
          ? t('dev.kmh', { value: formatNumber(Math.round(lastFix.speedMps * 3.6)) })
          : none,
    },
    { key: 'health', label: t('dev.health'), value: healthText },
    {
      key: 'source',
      label: t('dev.source'),
      value: state.source
        ? `${state.source.kind ? t(`dev.kinds.${state.source.kind}`) : none} · ${t(
            `dev.profiles.${state.source.profile}`,
          )}`
        : none,
    },
    {
      key: 'power',
      label: t('dev.power'),
      value: state.source ? t(`dev.powerModes.${state.source.mode}`) : none,
    },
  ];

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{t('dev.title')}</Text>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>
            {row.label}
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {row.value}
          </Text>
        </View>
      ))}
      <Text style={styles.logTitle}>{t('dev.log')}</Text>
      <ScrollView style={styles.log} nestedScrollEnabled>
        {state.log.length === 0 ? (
          <Text style={styles.label}>{t('dev.empty')}</Text>
        ) : (
          state.log.map((entry) => (
            <Text key={entry.id} style={styles.logLine} numberOfLines={1}>
              {`${clockTime(entry.at)}  ${logText(entry, t)}`}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
}

type Translate = TFunction<'rides'>;

function logText(entry: GpsLogEntry, t: Translate) {
  switch (entry.type) {
    case 'health':
      return t('dev.entries.health', { state: t(`dev.healthStates.${entry.state}`) });
    case 'motion':
      return t('dev.entries.motion', {
        state: t(entry.moving ? 'dev.motion.moving' : 'dev.motion.standing'),
      });
    case 'power':
      return t('dev.entries.power', { mode: t(`dev.powerModes.${entry.mode}`) });
    case 'source':
      return entry.started
        ? t('dev.entries.sourceStarted', {
            kind: entry.kind ? t(`dev.kinds.${entry.kind}`) : t('dev.none'),
          })
        : t('dev.entries.sourceStopped');
  }
}

/** "14:03:27" in the app language. */
function clockTime(at: number) {
  return new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(at));
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  upward: {
    flexDirection: 'column-reverse',
  },
  pill: {
    height: PILL_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceInverse,
    boxShadow: shadows.floatingPill,
  },
  pillOpen: {
    backgroundColor: colors.brand,
  },
  pillLabel: {
    ...typography.metricCaption,
    color: colors.textInverse,
  },
  panel: {
    width: PANEL_WIDTH,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: shadows.floating,
  },
  title: {
    ...typography.captionMedium,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    flexShrink: 1,
    color: colors.textSecondary,
  },
  value: {
    ...typography.metricCaption,
    flexShrink: 1,
    color: colors.textPrimary,
  },
  logTitle: {
    ...typography.captionMedium,
    marginTop: spacing.xs,
    color: colors.textPrimary,
  },
  log: {
    maxHeight: LOG_HEIGHT,
  },
  logLine: {
    ...typography.metricCaption,
    color: colors.textBody,
  },
});
