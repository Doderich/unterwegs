import { Column, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { StayWidgetProps } from '../types';

/**
 * Tonight's lodging, never its booking number. Android widgets get only `colorScheme` and no timeline, so the snapshot is
 * replaced on each recompute. A tap opens `url` (patches/expo-widgets+*.patch). Self-contained: see NextWidget.ios.tsx.
 */
const StayWidget = (props: StayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const tint = dark ? '#5FB3AE' : '#2F7672';
  const text = dark ? '#ECEDEE' : '#1C1B1F';
  const secondary = dark ? '#A0A4A8' : '#5F6368';
  return (
    <Column
      verticalArrangement={{ spacedBy: 4 }}
      modifiers={[fillMaxSize(), cornerRadius(20), background(dark ? '#1C1C1E' : '#FFFFFF'), paddingAll(14)]}>
      <Text color={tint} maxLines={1} style={{ typography: 'labelMedium', fontWeight: '600' }}>
        {props.label}
      </Text>
      {props.name ? (
        <Text color={text} maxLines={2} style={{ typography: 'titleMedium', fontWeight: '600' }}>
          {props.name}
        </Text>
      ) : null}
      {props.address ? (
        <Text color={secondary} maxLines={2} style={{ typography: 'bodySmall' }}>
          {props.address}
        </Text>
      ) : null}
      {props.detail ? (
        <Text color={text} maxLines={1} style={{ typography: 'bodyMedium', fontWeight: '600' }}>
          {props.detail}
        </Text>
      ) : null}
      {props.footer ? (
        <Text color={secondary} maxLines={1} style={{ typography: 'labelSmall' }}>
          {props.footer}
        </Text>
      ) : null}
    </Column>
  );
};

export default createWidget('StayWidget', StayWidget);
