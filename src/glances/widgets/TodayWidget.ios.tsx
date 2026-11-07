import { Button, HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  controlSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  opacity,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { CollectionConfiguration, Pickable, TodayWidgetProps } from '../types';

/** Today's plan. Self-contained: the widget runtime allows no imports or module scope (see NextWidget). */
const TodayWidget = (raw: Pickable<TodayWidgetProps>, environment: WidgetEnvironment<CollectionConfiguration>) => {
  'widget';
  // A widget set to one collection in its picker (iOS 17+); `auto` follows the focus collection.
  const chosen = environment.configuration ? environment.configuration.collection : 'auto';
  const props: TodayWidgetProps = (raw.byCollection && raw.byCollection[chosen]) || raw;
  const accent = environment.colorScheme === 'dark' ? '#5FB3AE' : '#2F7672';
  // The Today/Tomorrow switch (iOS 17+ buttons run without the app; the app resets it on its next update).
  const tomorrow = raw.showTomorrow && props.tomorrow ? props.tomorrow : null;
  const day = tomorrow ?? props;
  const rows = environment.widgetFamily === 'systemLarge' ? day.rows : day.rows.slice(0, 3);
  return (
    <VStack
      alignment="leading"
      spacing={5}
      modifiers={[
        containerBackground({ type: 'hierarchical', style: 'quinary' }, 'widget'),
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        widgetURL(props.url),
      ]}>
      <HStack spacing={4}>
        <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle(accent), lineLimit(1)]}>
          {day.title}
        </Text>
        <Spacer />
        {props.tomorrow ? (
          <Button
            target="day"
            label={tomorrow ? props.toToday : props.toTomorrow}
            onPress={() => ({ showTomorrow: !raw.showTomorrow })}
            modifiers={[buttonStyle('bordered'), controlSize('mini'), tint(accent)]}
          />
        ) : null}
      </HStack>
      {props.state === 'day' && rows.length === 0 ? (
        <Text modifiers={[font({ textStyle: 'subheadline' })]}>{props.emptyDay}</Text>
      ) : null}
      {rows.map((row, i) => (
        // Each row opens its own object (medium and large sizes; the small size only has `widgetURL`).
        <Link key={String(i)} destination={row.url}>
          <HStack spacing={6} modifiers={row.done ? [opacity(0.5)] : []}>
            <Image systemName={(row.done ? 'checkmark.circle.fill' : row.symbol) as never} color={accent} size={14} />
            {row.time ? (
              <Text
                modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), monospacedDigit(), lineLimit(1)]}>
                {row.time}
              </Text>
            ) : null}
            <Text modifiers={[font({ textStyle: 'subheadline' }), lineLimit(1)]}>{row.title}</Text>
          </HStack>
        </Link>
      ))}
      <Spacer />
      {day.night ? (
        <HStack spacing={6}>
          <Image systemName="bed.double.fill" color={accent} size={12} />
          <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>{day.night}</Text>
        </HStack>
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

export default createWidget<Pickable<TodayWidgetProps>, CollectionConfiguration>('TodayWidget', TodayWidget);
