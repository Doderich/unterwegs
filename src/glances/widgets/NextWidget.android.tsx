import { Column, Image, Row, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  paddingAll,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { NextWidgetProps } from '../types';

/**
 * The next collection, or what is still ahead today in the current one. Android widgets get only `colorScheme` and no
 * timeline, so the snapshot is replaced on each recompute. Taps open `url`, a row its own object
 * (patches/expo-widgets+*.patch). Self-contained, colours included: see NextWidget.ios.tsx.
 */
const NextWidget = (props: NextWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const surface = dark ? '#1A1F1E' : '#F3F7F6';
  const accent = dark ? '#8FD3CD' : '#2F7672';
  const ink = dark ? '#E6ECEB' : '#1B1F1E';
  const muted = dark ? '#9AA6A4' : '#5B6664';
  const rows = props.rows.slice(0, props.cover ? 2 : 3);
  const timed = rows.some((r) => r.time);
  return (
    <Column
      verticalArrangement={{ spacedBy: 2 }}
      modifiers={[fillMaxSize(), cornerRadius(22), background(surface), paddingAll(12)]}>
      {props.cover ? (
        <Image
          source={{ uri: props.cover }}
          contentScale="crop"
          modifiers={[fillMaxWidth(), height(rows.length > 1 ? 64 : 88), cornerRadius(14)]}
        />
      ) : null}
      {props.headline ? (
        <Text color={accent} maxLines={1} style={{ typography: 'labelSmall', fontWeight: 'bold' }}>
          {props.headline.toLocaleUpperCase()}
        </Text>
      ) : null}
      <Text color={ink} maxLines={props.cover ? 1 : 2} style={{ typography: 'titleSmall', fontWeight: 'bold' }}>
        {props.name}
      </Text>
      {rows.map((row, i) => (
        // A row's `url` opens its object (patches/expo-widgets+*.patch); the Compose typings don't list it.
        <Row key={String(i)} {...{ url: row.url }}>
          <Text
            color={accent}
            maxLines={1}
            style={{ typography: 'labelMedium', fontWeight: 'bold' }}
            modifiers={[width(timed ? 40 : 12)]}>
            {row.time || '•'}
          </Text>
          <Text color={muted} maxLines={rows.length === 1 ? 2 : 1} style={{ typography: 'bodySmall' }}>
            {row.title}
          </Text>
        </Row>
      ))}
      {props.footer ? (
        <Text color={muted} maxLines={1} style={{ typography: 'labelSmall' }}>
          {props.footer}
        </Text>
      ) : null}
    </Column>
  );
};

export default createWidget('NextWidget', NextWidget);
