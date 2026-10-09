import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import type { ReactNode } from 'react';

import type { RideActivityProps } from './rideActivityTypes';

/**
 * Lock Screen and Dynamic Island for a ride in progress (user decision 2026-10-09; not drawn in
 * Pencil, derived from 08.02 Kayıt): status dot (accent / warning / muted), the time as a system
 * timer that runs and pauses by itself, distance and current speed; in navigation the next
 * maneuver as well. Runs in the widget extension's isolated runtime: everything, including the
 * translated labels and the theme colors, arrives through props (see `rideLiveActivity.ts`).
 * Never import this file statically — `expo-widgets` is not in Expo Go.
 */
const RideActivity = (props: RideActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const dotColor =
    props.status === 'recording' ? props.accent : props.status === 'weak' ? props.warning : props.muted;
  // The system counts the time; while paused it stops at the moment the ride stopped counting.
  const timer = {
    lower: new Date(props.timerStartMs),
    upper: new Date(props.timerStartMs + 24 * 60 * 60 * 1000),
  };
  const pauseTime = props.timerRunning ? undefined : new Date(props.pausedAtMs);
  const dimmed = environment.isLuminanceReduced;

  const timeText = (size: number) => (
    <Text
      timerInterval={timer}
      countsDown={false}
      pauseTime={pauseTime}
      modifiers={[font({ size, weight: 'semibold', design: 'monospaced' }), monospacedDigit()]}
    />
  );
  const metric = (value: ReactNode, label: string) => (
    <VStack alignment="leading" spacing={2}>
      {value}
      <Text
        modifiers={[font({ size: 12 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
        {label}
      </Text>
    </VStack>
  );
  const valueText = (value: string) => (
    <Text modifiers={[font({ size: 22, weight: 'semibold', design: 'monospaced' }), monospacedDigit()]}>
      {value}
    </Text>
  );
  const dot = (size: number) => (
    <Image systemName="circle.fill" size={size} color={dimmed ? props.muted : dotColor} />
  );
  const hasInstruction = props.instruction.length > 0;

  return {
    banner: (
      <VStack alignment="leading" spacing={12} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={8}>
          {dot(10)}
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>
            {props.statusLabel}
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 13, weight: 'semibold' }),
              foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
              lineLimit(1),
            ]}>
            {props.title}
          </Text>
        </HStack>
        {hasInstruction ? (
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 17, weight: 'semibold' }), lineLimit(2)]}>
              {props.instruction}
            </Text>
            {props.instructionDetail.length > 0 ? (
              <Text
                modifiers={[
                  font({ size: 13 }),
                  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                  lineLimit(1),
                ]}>
                {props.instructionDetail}
              </Text>
            ) : null}
          </VStack>
        ) : null}
        <HStack spacing={16}>
          {metric(valueText(props.distance), props.distanceLabel)}
          <Spacer />
          {metric(timeText(22), props.durationLabel)}
          <Spacer />
          {metric(valueText(props.speed), props.speedLabel)}
        </HStack>
      </VStack>
    ),
    compactLeading: dot(12),
    compactTrailing: (
      <VStack modifiers={[frame({ maxWidth: 64, alignment: 'trailing' })]}>{timeText(14)}</VStack>
    ),
    minimal: dot(12),
    expandedLeading: (
      <VStack modifiers={[padding({ leading: 8 })]}>{metric(valueText(props.distance), props.distanceLabel)}</VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ trailing: 8 })]}>{metric(timeText(22), props.durationLabel)}</VStack>
    ),
    expandedBottom: (
      <HStack spacing={8} modifiers={[padding({ horizontal: 8 })]}>
        {dot(10)}
        <Text modifiers={[font({ size: 14, weight: 'medium' }), lineLimit(1)]}>
          {hasInstruction ? props.instruction : props.statusLabel}
        </Text>
        <Spacer />
      </HStack>
    ),
  };
};

export default createLiveActivity('RideActivity', RideActivity);
