import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Check, NavArrowLeft, Position } from 'iconoir-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeanDial } from '@/components/lean/LeanDial';
import { RECORD_SHEET_TOP_GAP, useSheetTopInset } from '@/components/record/recordSheetLayout';
import { calibrationFlow } from '@/features/lean/calibrationFlow';
import { createCalibrationHaptics } from '@/features/lean/calibrationHaptics';
import { leanCalibration } from '@/features/lean/leanCalibration';
import { createLeanLogger } from '@/features/lean/leanLog';
import { LEAN_SENSOR_RULES } from '@/features/lean/leanMath';
import { subscribeLean, type LeanSample } from '@/features/lean/leanSensor';
import { formatNumber } from '@/i18n/format';
import { colors, fontFamily, layout, radius, shadows, spacing } from '@/theme';

type Phase = 'live' | 'measuring' | 'done';
type Posture = 'upright' | 'tilted' | 'shaking';

/** Re-render the reading this often; samples arrive faster and are averaged in between. */
const RENDER_MS = 50;

const isTilted = (rawDeg: number) => Math.abs(rawDeg) > LEAN_SENSOR_RULES.uprightToleranceDeg;
const isShaking = (reading: { spreadDeg: number; rateDegS: number }) =>
  reading.spreadDeg > LEAN_SENSOR_RULES.stableSpreadDeg ||
  reading.rateDegS > LEAN_SENSOR_RULES.stableRateDegS;
const postureOf = (reading: { rawDeg: number; spreadDeg: number; rateDegS: number }): Posture =>
  isTilted(reading.rawDeg) ? 'tilted' : isShaking(reading) ? 'shaking' : 'upright';

/**
 * 08.00 Record / Kalibrasyon — Yatış açısı (Pencil `VnDkS` ready, `Z6SiY` tilted, `EoOOC`
 * shaking, `Ruy57` measuring, `OPOwg` done). The dial follows the phone's roll live from the
 * motion sensors. With the bike upright (±10°) and still, "Kalibre et" averages three seconds
 * as the zero point for this phone position; moving or tilting cancels it. "Kayda geç" (or
 * "Atla") returns to the Record tab, which then starts the ride (`then=record`). Haptics
 * (`calibrationHaptics`) mark the detents, the green and red states and the countdown.
 */
export function CalibrationScreen() {
  const { t } = useTranslation('ride');
  const insets = useSafeAreaInsets();
  const topInset = useSheetTopInset();
  const { then } = useLocalSearchParams<{ then?: 'record' }>();
  const [phase, setPhase] = useState<Phase>('live');
  const [reading, setReading] = useState({ rawDeg: 0, spreadDeg: 0, rateDegS: 0 });
  const [offset, setOffset] = useState(0);
  const [remainingS, setRemainingS] = useState(0);
  const window = useRef<LeanSample[]>([]);
  const measured = useRef<number[]>([]);
  const smoothed = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('live');
  const measureStartRef = useRef(0);
  const offsetRef = useRef(0);
  const remainingRef = useRef(0);
  const [haptics] = useState(createCalibrationHaptics);
  const [logLean] = useState(() => createLeanLogger('calibration'));

  useEffect(() => {
    const subscription = subscribeLean((sample) => {
      smoothed.current =
        smoothed.current === null
          ? sample.rawDeg
          : smoothed.current + (sample.rawDeg - smoothed.current) * LEAN_SENSOR_RULES.smoothing;
      window.current.push(sample);
      const cutoff = sample.timestamp - LEAN_SENSOR_RULES.stableWindowMs;
      while (window.current.length > 0 && window.current[0].timestamp < cutoff) {
        window.current.shift();
      }
      if (phaseRef.current === 'measuring') {
        measured.current.push(sample.rawDeg);
      }
    });
    const timer = setInterval(() => {
      const samples = window.current;
      if (samples.length === 0 || smoothed.current === null) {
        return;
      }
      const values = samples.map((item) => item.rawDeg);
      const next = {
        rawDeg: smoothed.current,
        spreadDeg: Math.max(...values) - Math.min(...values),
        rateDegS: Math.max(...samples.map((item) => item.rateDegS)),
      };
      setReading(next);
      logLean(next.rawDeg - offsetRef.current, next.rawDeg, offsetRef.current);
      const now = Date.now();
      if (phaseRef.current === 'live') {
        haptics.reading(next.rawDeg, postureOf(next), now);
      } else if (phaseRef.current === 'done') {
        haptics.reading(next.rawDeg - offsetRef.current, null, now);
      }
      // Measuring: moving or tilting cancels; three still seconds save the zero point.
      if (phaseRef.current === 'measuring') {
        const elapsed = now - measureStartRef.current;
        const posture = postureOf(next);
        if (posture !== 'upright') {
          haptics.cancelled(posture);
          haptics.resetTicks();
          phaseRef.current = 'live';
          setPhase('live');
        } else if (elapsed >= LEAN_SENSOR_RULES.calibrationMs) {
          const taken = measured.current;
          const zero = taken.reduce((sum, value) => sum + value, 0) / Math.max(taken.length, 1);
          leanCalibration.save(zero);
          offsetRef.current = zero;
          setOffset(zero);
          haptics.saved();
          haptics.resetTicks();
          phaseRef.current = 'done';
          setPhase('done');
        } else {
          const remaining = Math.ceil((LEAN_SENSOR_RULES.calibrationMs - elapsed) / 1000);
          if (remaining < remainingRef.current) {
            haptics.countdown();
          }
          remainingRef.current = remaining;
          setRemainingS(remaining);
        }
      }
    }, RENDER_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [haptics, logLean]);

  const lean = phase === 'done' ? reading.rawDeg - offset : reading.rawDeg;
  const shaking = isShaking(reading);
  const tilted = phase !== 'done' && isTilted(reading.rawDeg);
  const posture: Posture = tilted ? 'tilted' : shaking ? 'shaking' : 'upright';


  const startMeasuring = () => {
    measured.current = [];
    measureStartRef.current = Date.now();
    remainingRef.current = LEAN_SENSOR_RULES.calibrationMs / 1000;
    setRemainingS(remainingRef.current);
    haptics.countdown();
    phaseRef.current = 'measuring';
    setPhase('measuring');
  };

  const leave = () => {
    if (then === 'record') {
      calibrationFlow.requestStart();
    }
    router.back();
  };

  const skip = () => {
    leanCalibration.markSkipped();
    leave();
  };

  const tone =
    phase === 'done' || phase === 'measuring'
      ? colors.textPrimary
      : posture === 'tilted'
        ? colors.danger
        : posture === 'shaking'
          ? colors.leanWarn
          : colors.textPrimary;
  const side = lean >= 0 ? 'right' : 'left';
  const readingLabel =
    phase === 'done'
      ? t('calibration.zeroSaved')
      : Math.abs(lean) >= 1 && phase !== 'measuring'
        ? t(`calibration.liveSide.${side}`)
        : t('calibration.live');

  const chip =
    phase === 'done'
      ? { tone: 'ok', label: t('calibration.status.done') }
      : phase === 'measuring'
        ? { tone: 'ok', label: t('calibration.status.measuring') }
        : posture === 'tilted'
          ? {
              tone: 'error',
              label: t(`calibration.status.tilted.${reading.rawDeg > 0 ? 'right' : 'left'}`),
            }
          : posture === 'shaking'
            ? { tone: 'warn', label: t('calibration.status.shaking') }
            : { tone: 'ok', label: t('calibration.status.upright') };

  const steps = [
    { key: 'mount', state: 'done', sub: t('calibration.steps.mount.sub') },
    {
      key: 'upright',
      state: tilted ? 'error' : 'done',
      sub: tilted
        ? t(`calibration.steps.upright.tilted.${reading.rawDeg > 0 ? 'right' : 'left'}`)
        : t('calibration.steps.upright.sub'),
    },
    {
      key: 'still',
      state: phase === 'done' ? 'done' : tilted ? 'pending' : 'active',
      sub:
        phase === 'done'
          ? t('calibration.steps.still.done')
          : phase === 'measuring'
            ? t('calibration.steps.still.measuring')
            : posture === 'shaking'
              ? t('calibration.steps.still.shaking')
              : t('calibration.steps.still.sub'),
    },
  ] as const;

  const ctaEnabled = phase === 'done' || (phase === 'live' && posture === 'upright');

  return (
    <View style={[styles.screen, { paddingTop: topInset + RECORD_SHEET_TOP_GAP - TOP_BAR_PADDING }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('calibration.back')}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <NavArrowLeft width={24} height={24} color={colors.textPrimary} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {t('calibration.title')}
        </Text>
        <Pressable onPress={skip} accessibilityRole="button" style={styles.skip} hitSlop={8}>
          <Text style={styles.skipLabel}>{t('calibration.skip')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('calibration.eyebrow')}</Text>
          <Text style={styles.headline}>{t('calibration.headline')}</Text>
          <Text style={styles.description}>{t('calibration.description')}</Text>
        </View>

        <View style={styles.gauge}>
          <LeanDial
            leanDeg={lean}
            tone={tone}
            showDeviation={posture === 'tilted' && phase === 'live'}
            leftLabel={t('calibration.left')}
            rightLabel={t('calibration.right')}
          />
          <View
            style={styles.reading}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`${readingLabel}: ${t('calibration.degrees', {
              value: formatNumber(Math.abs(lean), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
            })}`}>
            <Text style={[styles.value, posture === 'tilted' && phase === 'live' && styles.valueError]}>
              {t('calibration.degrees', {
                value: formatNumber(Math.abs(lean), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
              })}
            </Text>
            <Text style={styles.readingLabel}>{readingLabel}</Text>
          </View>
          <View
            style={[
              styles.chip,
              chip.tone === 'error' ? styles.chipError : chip.tone === 'warn' ? styles.chipWarn : styles.chipOk,
            ]}>
            <View
              style={[
                styles.chipDot,
                {
                  backgroundColor:
                    chip.tone === 'error' ? colors.danger : chip.tone === 'warn' ? colors.leanWarn : colors.leanOkDot,
                },
              ]}
            />
            <Text
              style={[
                styles.chipLabel,
                {
                  color:
                    chip.tone === 'error' ? colors.dangerText : chip.tone === 'warn' ? colors.warning : colors.leanOkText,
                },
              ]}>
              {chip.label}
            </Text>
          </View>
        </View>

        <View style={styles.checklist}>
          {steps.map((step, index) => (
            <View key={step.key} style={styles.step}>
              <View
                style={[
                  styles.indicator,
                  step.state === 'done' && styles.indicatorDone,
                  step.state === 'error' && styles.indicatorError,
                  step.state === 'active' && styles.indicatorActive,
                ]}>
                {step.state === 'done' ? (
                  <Check width={14} height={14} color={colors.textPrimary} strokeWidth={2.2} />
                ) : (
                  <Text style={[styles.stepNumber, step.state !== 'pending' && styles.stepNumberInverse]}>
                    {formatNumber(index + 1)}
                  </Text>
                )}
              </View>
              <View style={styles.stepText}>
                <Text
                  style={[
                    styles.stepTitle,
                    step.state === 'active' && styles.stepTitleActive,
                    step.state === 'error' && styles.stepTitleError,
                  ]}>
                  {t(`calibration.steps.${step.key}.title`)}
                </Text>
                <Text style={styles.stepSub}>{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          onPress={phase === 'done' ? leave : startMeasuring}
          disabled={!ctaEnabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ctaEnabled, busy: phase === 'measuring' }}
          style={({ pressed }) => [
            styles.cta,
            !ctaEnabled && phase !== 'measuring' && styles.ctaDisabled,
            pressed && styles.ctaPressed,
          ]}>
          {phase === 'measuring' ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : phase === 'done' ? (
            <ArrowRight width={20} height={20} color={colors.textInverse} strokeWidth={1.8} />
          ) : (
            <Position
              width={20}
              height={20}
              color={ctaEnabled ? colors.textInverse : colors.textTertiary}
              strokeWidth={1.8}
            />
          )}
          <Text style={[styles.ctaLabel, !ctaEnabled && phase !== 'measuring' && styles.ctaLabelDisabled]}>
            {phase === 'done'
              ? t('calibration.toRecord')
              : phase === 'measuring'
                ? t('calibration.measuring', { seconds: formatNumber(Math.max(remainingS, 1)) })
                : t('calibration.calibrate')}
          </Text>
        </Pressable>
        <Text style={styles.note}>{t('calibration.note')}</Text>
      </View>
    </View>
  );
}

/** The top bar's own top padding (Pencil `AAXNS`, 8): its back button lines up with the sheet's ⌄. */
const TOP_BAR_PADDING = 8;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenGutter,
  },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.surface,
    boxShadow: shadows.mapAction,
  },
  pressed: {
    backgroundColor: colors.surfacePressed,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  skip: {
    width: 48,
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xxl,
  },
  eyebrow: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  headline: {
    fontFamily: fontFamily.semibold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  gauge: {
    alignItems: 'center',
    gap: 10,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  reading: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontFamily: fontFamily.monoBold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.5,
    color: colors.textPrimary,
  },
  valueError: {
    color: colors.danger,
  },
  readingLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  chipOk: {
    backgroundColor: colors.leanOkSurface,
  },
  chipError: {
    backgroundColor: colors.dangerSurface,
  },
  chipWarn: {
    backgroundColor: colors.warningSurface,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 15,
  },
  checklist: {
    gap: spacing.md,
    paddingTop: 18,
    paddingHorizontal: spacing.xxl,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  indicator: {
    width: 28,
    height: 28,
    marginTop: spacing.xs,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  indicatorDone: {
    backgroundColor: colors.leanZone,
  },
  indicatorError: {
    backgroundColor: colors.danger,
  },
  indicatorActive: {
    backgroundColor: colors.textPrimary,
  },
  stepNumber: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  stepNumberInverse: {
    color: colors.textInverse,
  },
  stepText: {
    flex: 1,
    gap: spacing.xxs,
  },
  stepTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  stepTitleActive: {
    fontFamily: fontFamily.semibold,
  },
  stepTitleError: {
    color: colors.dangerText,
  },
  stepSub: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  footer: {
    gap: 14,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  cta: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.textPrimary,
  },
  ctaDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 22,
    color: colors.textInverse,
  },
  ctaLabelDisabled: {
    color: colors.textTertiary,
  },
  note: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
