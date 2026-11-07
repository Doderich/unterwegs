import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import type { TravelActivityProps } from './types';

/*
 * Travel day on the Lock Screen and in the Dynamic Island (docs/GLANCES.md). The app can't update it while
 * closed, so the countdown is a system timer that runs by itself, and the stale date (arrival + 30 min) switches it
 * to "Arrived". Runs in the widget runtime: no imports or module scope (see widgets/NextWidget.ios.tsx).
 */
const TravelActivity = (props: TravelActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const tint = environment.isLuminanceReduced ? '#FFFFFF' : '#5FB3AE';
  const started = Date.now() >= props.departAt;
  const done = !!environment.isStale;
  const target = new Date(started && props.arriveAt ? props.arriveAt : props.departAt);
  const timer = done ? (
    <Text modifiers={[font({ textStyle: 'headline' })]}>{props.labels.arrived}</Text>
  ) : (
    <Text
      timerInterval={{ lower: new Date(Math.min(Date.now(), target.getTime())), upper: target }}
      countsDown
      modifiers={[font({ textStyle: 'title2', weight: 'semibold' }), monospacedDigit(), frame({ maxWidth: 96 })]}
    />
  );
  const caption = started ? props.labels.arrives : props.labels.departs;
  const routeText = props.from && props.to ? `${props.from} → ${props.to}` : props.title;

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 16 }), activityBackgroundTint(null)]}>
        <Image systemName={props.symbol as never} color={tint} size={28} />
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>{routeText}</Text>
          <Text modifiers={[font({ textStyle: 'subheadline' }), monospacedDigit(), lineLimit(1)]}>
            {props.arrives ? `${props.departs} → ${props.arrives}` : props.departs}
          </Text>
          {props.lodging ? (
            <Text
              modifiers={[
                font({ textStyle: 'caption' }),
                foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                lineLimit(1),
              ]}>
              {props.lodging}
            </Text>
          ) : null}
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={0}>
          {done ? null : (
            <Text
              modifiers={[
                font({ textStyle: 'caption' }),
                foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
              ]}>
              {caption}
            </Text>
          )}
          {timer}
        </VStack>
      </HStack>
    ),
    compactLeading: <Image systemName={props.symbol as never} color={tint} />,
    compactTrailing: done ? (
      <Image systemName="checkmark" color={tint} />
    ) : (
      <Text
        timerInterval={{ lower: new Date(Math.min(Date.now(), target.getTime())), upper: target }}
        countsDown
        modifiers={[monospacedDigit(), frame({ maxWidth: 56 })]}
      />
    ),
    minimal: <Image systemName={props.symbol as never} color={tint} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 8 })]}>
        <Image systemName={props.symbol as never} color={tint} size={22} />
        <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>{props.from}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2} modifiers={[padding({ trailing: 8 })]}>
        {timer}
        <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>{props.to}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ horizontal: 8 })]}>
        <Text modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), lineLimit(1)]}>{props.title}</Text>
        <Text modifiers={[font({ textStyle: 'subheadline' }), monospacedDigit(), lineLimit(1)]}>
          {`${props.labels.departs} ${props.departs}`}
          {props.arrives ? ` · ${props.labels.arrives} ${props.arrives}` : ''}
        </Text>
        {props.lodging ? (
          <Text
            modifiers={[
              font({ textStyle: 'caption' }),
              foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
              lineLimit(1),
            ]}>
            {props.lodging}
          </Text>
        ) : null}
      </VStack>
    ),
  };
};

export default createLiveActivity('TravelActivity', TravelActivity);
