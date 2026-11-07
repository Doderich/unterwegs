import { Box, Button, Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, paddingAll, width } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodayWidgetProps } from '../types';

/**
 * Today's plan: a time column, visited locations struck through, tonight's lodging at the end, and a small
 * Today/Tomorrow switch in the corner. Android widgets get only `colorScheme` and no timeline, so the snapshot is
 * replaced on each recompute. Taps open `url`, a row its own object (patches/expo-widgets+*.patch). Self-contained,
 * colours included: see NextWidget.ios.tsx.
 */
const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const surface = dark ? '#1A1F1E' : '#F3F7F6';
  const accent = dark ? '#8FD3CD' : '#2F7672';
  const ink = dark ? '#E6ECEB' : '#1B1F1E';
  const muted = dark ? '#9AA6A4' : '#5B6664';
  const chip = dark ? '#2A3634' : '#DCEBE9';
  const tomorrow = props.showTomorrow && props.tomorrow ? props.tomorrow : null;
  const day = tomorrow || props;
  const rows = day.rows.slice(0, 4);
  const timed = rows.some((r) => r.time);
  return (
    <Box modifiers={[fillMaxSize(), cornerRadius(22), background(surface), paddingAll(16)]}>
      <Column verticalArrangement={{ spacedBy: 3 }} modifiers={[fillMaxSize()]}>
        {/* Room on the right for the switch. */}
        <Text
          color={accent}
          maxLines={1}
          style={{ typography: 'labelMedium', fontWeight: 'bold' }}
          modifiers={[padding(0, 0, props.tomorrow ? 96 : 0, 4)]}>
          {day.title}
        </Text>
        {props.state === 'day' && rows.length === 0 ? (
          <Text color={muted} style={{ typography: 'bodyMedium' }}>
            {props.emptyDay}
          </Text>
        ) : null}
        {rows.map((row, i) => (
          // A row's `url` opens its object (patches/expo-widgets+*.patch); the Compose typings don't list it.
          <Row key={String(i)} {...{ url: row.url }}>
            <Text
              color={row.done ? muted : accent}
              maxLines={1}
              style={{ typography: 'labelLarge', fontWeight: 'bold' }}
              modifiers={[width(timed ? 52 : 16)]}>
              {row.time || '•'}
            </Text>
            <Text
              color={row.done ? muted : ink}
              maxLines={1}
              style={{ typography: 'bodyMedium', textDecoration: row.done ? 'lineThrough' : 'none' }}>
              {row.title}
            </Text>
          </Row>
        ))}
        {day.night ? (
          <Text color={muted} maxLines={1} style={{ typography: 'labelMedium' }} modifiers={[padding(0, 4, 0, 0)]}>
            {day.night}
          </Text>
        ) : null}
        {props.footer ? (
          <Text color={muted} maxLines={1} style={{ typography: 'labelSmall' }}>
            {props.footer}
          </Text>
        ) : null}
      </Column>
      {props.tomorrow ? (
        <Box contentAlignment="topEnd" modifiers={[fillMaxSize()]}>
          {/* `target` names the button for the press handler; the Compose typings don't list it yet. */}
          <Button
            {...{ target: 'day' }}
            onClick={() => ({ showTomorrow: !props.showTomorrow })}
            contentPadding={{ start: 12, end: 12, top: 0, bottom: 0 }}
            colors={{ containerColor: chip, contentColor: accent }}>
            <Text style={{ typography: 'labelMedium', fontWeight: 'bold' }}>
              {tomorrow ? `‹ ${props.toToday}` : `${props.toTomorrow} ›`}
            </Text>
          </Button>
        </Box>
      ) : null}
    </Box>
  );
};

export default createWidget('TodayWidget', TodayWidget);
