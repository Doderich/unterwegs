import { Column, Image, Row, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  paddingAll,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { NextWidgetProps } from '../types';

/**
 * The next collection, or today in the current one. Android widgets get only `colorScheme` and no timeline, so the snapshot is
 * replaced on each recompute. A tap opens `url` (patches/expo-widgets+*.patch). Self-contained: see NextWidget.ios.tsx.
 */
const NextWidget = (props: NextWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const tint = dark ? '#5FB3AE' : '#2F7672';
  const text = dark ? '#ECEDEE' : '#1C1B1F';
  const secondary = dark ? '#A0A4A8' : '#5F6368';
  return (
    <Column
      verticalArrangement={{ spacedBy: 4 }}
      modifiers={[fillMaxSize(), cornerRadius(20), background(dark ? '#1C1C1E' : '#FFFFFF'), paddingAll(14)]}>
      {props.cover ? (
        <Image
          source={{ uri: props.cover }}
          contentScale="crop"
          modifiers={[fillMaxWidth(), height(72), cornerRadius(12)]}
        />
      ) : null}
      <Text color={tint} maxLines={1} style={{ typography: 'labelMedium', fontWeight: '600' }}>
        {props.headline}
      </Text>
      <Text color={text} maxLines={2} style={{ typography: 'titleMedium', fontWeight: '600' }}>
        {props.name}
      </Text>
      {props.rows.map((row, i) => (
        // A row's `url` opens its object (patches/expo-widgets+*.patch); the Compose typings don't list it.
        <Row key={String(i)} {...{ url: row.url }}>
          <Text color={text} maxLines={1} style={{ typography: 'bodySmall' }}>
            {row.time ? `${row.time}  ${row.title}` : row.title}
          </Text>
        </Row>
      ))}
      {props.footer ? (
        <Text color={secondary} maxLines={1} style={{ typography: 'labelSmall' }}>
          {props.footer}
        </Text>
      ) : null}
    </Column>
  );
};

export default createWidget('NextWidget', NextWidget);
