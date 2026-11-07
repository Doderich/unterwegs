import { Box, Button, Column, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { DepartureWidgetProps } from '../types';

/**
 * The next transportation: its name, the stations, and the departure time large, each time in its own zone. A small
 * button in the corner steps through the next ones, also with the app closed; the app resets it. Android widgets get
 * only `colorScheme` and no timeline. A tap elsewhere opens the shown transportation (patches/expo-widgets+*.patch).
 * Self-contained, colours included: see NextWidget.ios.tsx.
 */
const DepartureWidget = (props: DepartureWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const surface = dark ? '#1A1F1E' : '#F3F7F6';
  const accent = dark ? '#8FD3CD' : '#2F7672';
  const ink = dark ? '#E6ECEB' : '#1B1F1E';
  const muted = dark ? '#9AA6A4' : '#5B6664';
  const chip = dark ? '#2A3634' : '#DCEBE9';
  const d = (props.items && props.items[props.index]) || props;
  const more = props.items ? props.items.length : 0;
  const name = d.title || d.route;
  const label = d.day ? `${props.label} · ${d.day}` : props.label;
  return (
    <Box modifiers={[fillMaxSize(), cornerRadius(22), background(surface), paddingAll(12)]}>
      <Column verticalArrangement={{ spacedBy: 1 }} modifiers={[fillMaxSize()]}>
        <Text color={accent} maxLines={1} style={{ typography: 'labelSmall', fontWeight: 'bold' }}>
          {label.toLocaleUpperCase()}
        </Text>
        {name ? (
          <Text color={ink} maxLines={2} style={{ typography: 'titleSmall', fontWeight: 'bold' }}>
            {name}
          </Text>
        ) : null}
        {d.route && d.route !== name ? (
          <Text color={muted} maxLines={1} style={{ typography: 'bodySmall' }}>
            {d.route}
          </Text>
        ) : null}
        {d.departs ? (
          <Text color={ink} maxLines={1} style={{ typography: 'headlineSmall', fontWeight: 'bold' }}>
            {d.departs}
          </Text>
        ) : null}
        {d.arrives ? (
          <Text color={muted} maxLines={1} style={{ typography: 'bodySmall' }}>
            {`→ ${d.arrives}`}
          </Text>
        ) : null}
      </Column>
      {more > 1 ? (
        <Box contentAlignment="bottomEnd" modifiers={[fillMaxSize()]}>
          {/* `target` names the button for the press handler; the Compose typings don't list it yet. */}
          <Button
            {...{ target: 'next' }}
            onClick={() => {
              const index = (props.index + 1) % more;
              return { index, url: props.items[index].url };
            }}
            contentPadding={{ start: 10, end: 10, top: 0, bottom: 0 }}
            colors={{ containerColor: chip, contentColor: accent }}>
            <Text style={{ typography: 'labelMedium', fontWeight: 'bold' }}>{`${props.index + 1}/${more} ›`}</Text>
          </Button>
        </Box>
      ) : null}
    </Box>
  );
};

export default createWidget('DepartureWidget', DepartureWidget);
