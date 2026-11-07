import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  controlSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { DepartureWidgetProps } from '../types';

/** The next transportation, times in their own zones. Self-contained (see NextWidget). */
const DepartureWidget = (props: DepartureWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const accent = environment.colorScheme === 'dark' ? '#5FB3AE' : '#2F7672';
  if (environment.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack
        alignment="leading"
        spacing={1}
        modifiers={[containerBackground({ type: 'hierarchical', style: 'quinary' }, 'widget'), widgetURL(props.url)]}>
        <HStack spacing={4}>
          <Image systemName={props.symbol as never} size={12} />
          <Text modifiers={[font({ textStyle: 'headline' }), monospacedDigit(), lineLimit(1)]}>
            {props.state === 'none' ? props.label : props.departs}
          </Text>
        </HStack>
        {props.route ? <Text modifiers={[lineLimit(1)]}>{props.route}</Text> : null}
        {props.day ? <Text modifiers={[lineLimit(1)]}>{props.day}</Text> : null}
      </VStack>
    );
  }
  // The "Next" button steps through the coming transportations (iOS 17+, without the app); the app resets it.
  const d = (props.items && props.items[props.index]) || props;
  const more = props.items ? props.items.length : 0;
  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[
        containerBackground({ type: 'hierarchical', style: 'quinary' }, 'widget'),
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        widgetURL(d.url),
      ]}>
      <HStack spacing={4}>
        <Image systemName={d.symbol as never} color={accent} size={12} />
        <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle(accent), lineLimit(1)]}>
          {d.day ? `${props.label} · ${d.day}` : props.label}
        </Text>
        <Spacer />
        {more > 1 ? (
          <Button
            target="next"
            label={props.nextLabel}
            systemImage="chevron.right"
            onPress={() => {
              const index = (props.index + 1) % more;
              return { index, url: props.items[index].url };
            }}
            modifiers={[buttonStyle('bordered'), controlSize('mini'), tint(accent)]}
          />
        ) : null}
      </HStack>
      {d.route ? <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(2)]}>{d.route}</Text> : null}
      {d.title && d.title !== d.route ? (
        <Text
          modifiers={[
            font({ textStyle: 'caption' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            lineLimit(1),
          ]}>
          {d.title}
        </Text>
      ) : null}
      <Spacer />
      {d.departs ? (
        <Text modifiers={[font({ textStyle: 'title3', weight: 'semibold' }), monospacedDigit(), lineLimit(1)]}>
          {d.arrives ? `${d.departs} → ${d.arrives}` : d.departs}
        </Text>
      ) : null}
      {props.footer ? (
        <Text
          modifiers={[
            font({ textStyle: 'caption2' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            lineLimit(1),
          ]}>
          {props.footer}
        </Text>
      ) : null}
    </VStack>
  );
};

export default createWidget('DepartureWidget', DepartureWidget);
