import { Button, Column, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { DepartureWidgetProps } from '../types';

/**
 * The next transportation, times in their own zones, with a "Next" button. Android widgets get only `colorScheme` and
 * no timeline, so the snapshot is replaced on each recompute. A tap elsewhere opens `url`
 * (patches/expo-widgets+*.patch). Self-contained: see NextWidget.ios.tsx.
 */
const DepartureWidget = (props: DepartureWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const tint = dark ? '#5FB3AE' : '#2F7672';
  const text = dark ? '#ECEDEE' : '#1C1B1F';
  const secondary = dark ? '#A0A4A8' : '#5F6368';
  // The "Next" button steps through the coming transportations, also with the app closed; the app resets it.
  const d = (props.items && props.items[props.index]) || props;
  const more = props.items ? props.items.length : 0;
  return (
    <Column
      verticalArrangement={{ spacedBy: 4 }}
      modifiers={[fillMaxSize(), cornerRadius(20), background(dark ? '#1C1C1E' : '#FFFFFF'), paddingAll(14)]}>
      <Text color={tint} maxLines={1} style={{ typography: 'labelMedium', fontWeight: '600' }}>
        {d.day ? `${props.label} · ${d.day}` : props.label}
      </Text>
      {d.route ? (
        <Text color={text} maxLines={2} style={{ typography: 'titleMedium', fontWeight: '600' }}>
          {d.route}
        </Text>
      ) : null}
      {d.title && d.title !== d.route ? (
        <Text color={secondary} maxLines={1} style={{ typography: 'bodySmall' }}>
          {d.title}
        </Text>
      ) : null}
      {d.departs ? (
        <Text color={text} maxLines={1} style={{ typography: 'titleLarge', fontWeight: '600' }}>
          {d.arrives ? `${d.departs} → ${d.arrives}` : d.departs}
        </Text>
      ) : null}
      {more > 1 ? (
        // `target` names the button for the press handler; the Compose typings don't list it yet.
        <Button
          {...{ target: 'next' }}
          onClick={() => {
            const index = (props.index + 1) % more;
            return { index, url: props.items[index].url };
          }}
          colors={{ containerColor: tint, contentColor: dark ? '#000000' : '#FFFFFF' }}>
          <Text>{props.nextLabel}</Text>
        </Button>
      ) : null}
      {props.footer ? (
        <Text color={secondary} maxLines={1} style={{ typography: 'labelSmall' }}>
          {props.footer}
        </Text>
      ) : null}
    </Column>
  );
};

export default createWidget('DepartureWidget', DepartureWidget);
