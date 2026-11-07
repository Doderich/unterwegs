import { Button, Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayWidgetProps } from '../types';

/**
 * Today's plan, with a Today/Tomorrow switch. Android widgets get only `colorScheme` and no timeline, so the snapshot
 * is replaced on each recompute. A tap elsewhere opens `url` (patches/expo-widgets+*.patch). Self-contained: see
 * NextWidget.ios.tsx.
 */
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const tint = dark ? '#5FB3AE' : '#2F7672';
  const text = dark ? '#ECEDEE' : '#1C1B1F';
  const secondary = dark ? '#A0A4A8' : '#5F6368';
  const tomorrow = props.showTomorrow && props.tomorrow ? props.tomorrow : null;
  const day = tomorrow || props;
  return (
    <Column
      verticalArrangement={{ spacedBy: 4 }}
      modifiers={[fillMaxSize(), cornerRadius(20), background(dark ? '#1C1C1E' : '#FFFFFF'), paddingAll(14)]}>
      <Text color={tint} maxLines={1} style={{ typography: 'labelMedium', fontWeight: '600' }}>
        {day.title}
      </Text>
      {props.state === 'day' && day.rows.length === 0 ? (
        <Text color={text} style={{ typography: 'bodyMedium' }}>
          {props.emptyDay}
        </Text>
      ) : null}
      {day.rows.map((row, i) => (
        // A row's `url` opens its object (patches/expo-widgets+*.patch); the Compose typings don't list it.
        <Row key={String(i)} {...{ url: row.url }}>
          <Text color={row.done ? secondary : text} maxLines={1} style={{ typography: 'bodyMedium' }}>
            {(row.done ? '✓ ' : '') + (row.time ? `${row.time}  ${row.title}` : row.title)}
          </Text>
        </Row>
      ))}
      {day.night ? (
        <Text color={secondary} maxLines={1} style={{ typography: 'bodySmall' }}>
          {day.night}
        </Text>
      ) : null}
      {props.tomorrow ? (
        // `target` names the button for the press handler; the Compose typings don't list it yet.
        <Button
          {...{ target: 'day' }}
          onClick={() => ({ showTomorrow: !props.showTomorrow })}
          colors={{ containerColor: tint, contentColor: dark ? '#000000' : '#FFFFFF' }}>
          <Text>{tomorrow ? props.toToday : props.toTomorrow}</Text>
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

export default createWidget('TodayWidget', TodayWidget);
