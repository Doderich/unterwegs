import { Column, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { StayWidgetProps } from '../types';

/**
 * Tonight's lodging, never its booking number. Android widgets get only `colorScheme` and no timeline, so the snapshot
 * is replaced on each recompute. A tap opens the lodging (patches/expo-widgets+*.patch). Self-contained, colours
 * included: see NextWidget.ios.tsx.
 */
const StayWidget = (props: StayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const surface = dark ? '#1A1F1E' : '#F3F7F6';
  const accent = dark ? '#8FD3CD' : '#2F7672';
  const ink = dark ? '#E6ECEB' : '#1B1F1E';
  const muted = dark ? '#9AA6A4' : '#5B6664';
  return (
    <Column
      verticalArrangement={{ spacedBy: 2 }}
      modifiers={[fillMaxSize(), cornerRadius(22), background(surface), paddingAll(12)]}>
      <Text color={accent} maxLines={1} style={{ typography: 'labelSmall', fontWeight: 'bold' }}>
        {props.label.toLocaleUpperCase()}
      </Text>
      {props.name ? (
        <Text color={ink} maxLines={2} style={{ typography: 'titleSmall', fontWeight: 'bold' }}>
          {props.name}
        </Text>
      ) : null}
      {props.address ? (
        <Text color={muted} maxLines={2} style={{ typography: 'bodySmall' }}>
          {props.address}
        </Text>
      ) : null}
      {props.detail ? (
        <Text
          color={ink}
          maxLines={1}
          style={{ typography: 'labelLarge', fontWeight: 'bold' }}
          modifiers={[padding(0, 4, 0, 0)]}>
          {props.detail}
        </Text>
      ) : null}
      {props.footer ? (
        <Text color={muted} maxLines={1} style={{ typography: 'labelSmall' }}>
          {props.footer}
        </Text>
      ) : null}
    </Column>
  );
};

export default createWidget('StayWidget', StayWidget);
