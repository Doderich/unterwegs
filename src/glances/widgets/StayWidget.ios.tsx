import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { StayWidgetProps } from '../types';

/** Tonight's lodging. Never the booking number: widgets can show on a locked phone. Self-contained (see NextWidget). */
const StayWidget = (props: StayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const tint = environment.colorScheme === 'dark' ? '#5FB3AE' : '#2F7672';
  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[
        containerBackground({ type: 'hierarchical', style: 'quinary' }, 'widget'),
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        widgetURL(props.url),
      ]}>
      <HStack spacing={4}>
        <Image systemName="bed.double.fill" color={tint} size={12} />
        <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle(tint), lineLimit(1)]}>
          {props.label}
        </Text>
      </HStack>
      {props.name ? <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(2)]}>{props.name}</Text> : null}
      {props.address ? (
        <Text
          modifiers={[
            font({ textStyle: 'caption' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            lineLimit(2),
          ]}>
          {props.address}
        </Text>
      ) : null}
      <Spacer />
      {props.detail ? (
        <Text modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), lineLimit(1)]}>{props.detail}</Text>
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

export default createWidget('StayWidget', StayWidget);
