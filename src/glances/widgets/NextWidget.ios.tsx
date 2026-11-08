import { HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  aspectRatio,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  resizable,
  widgetAccentedRenderingMode,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { CollectionConfiguration, NextWidgetProps, Pickable } from '../types';

/*
 * The widget runs in its own JS runtime: no imports at runtime, nothing from module scope, no hooks (expo-widgets).
 * Everything it shows comes finished in `props` (src/glances/compute.ts).
 */
const NextWidget = (raw: Pickable<NextWidgetProps>, environment: WidgetEnvironment<CollectionConfiguration>) => {
  'widget';
  // A widget set to one collection in its picker (iOS 17+); `auto` follows the focus collection.
  const chosen = environment.configuration ? environment.configuration.collection : 'auto';
  const props: NextWidgetProps = (raw.byCollection && raw.byCollection[chosen]) || raw;
  const tint = environment.colorScheme === 'dark' ? '#5FB3AE' : '#2F7672';
  const family = environment.widgetFamily;
  const background = containerBackground({ type: 'hierarchical', style: 'quinary' }, 'widget');

  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[widgetURL(props.url)]}>
        {props.state === 'none' ? props.name : `${props.name} · ${props.headline}`}
      </Text>
    );
  }
  if (family === 'accessoryCircular') {
    return (
      <VStack spacing={0} modifiers={[background, widgetURL(props.url)]}>
        <Text modifiers={[font({ size: 20, weight: 'bold', design: 'rounded' }), monospacedDigit()]}>
          {props.short}
        </Text>
        <Text modifiers={[font({ textStyle: 'caption2' })]}>{props.shortCaption}</Text>
      </VStack>
    );
  }
  if (family === 'accessoryRectangular') {
    const row = props.rows[0];
    return (
      <VStack alignment="leading" spacing={1} modifiers={[background, widgetURL(props.url)]}>
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>{props.name}</Text>
        {props.headline ? <Text modifiers={[lineLimit(1)]}>{props.headline}</Text> : null}
        {row ? <Text modifiers={[lineLimit(1)]}>{row.time ? `${row.time} ${row.title}` : row.title}</Text> : null}
      </VStack>
    );
  }

  const rows = family === 'systemSmall' ? props.rows.slice(0, 2) : props.rows;
  const content = (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' })]}>
      <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle(tint), lineLimit(1)]}>
        {props.headline || ' '}
      </Text>
      <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(2)]}>{props.name}</Text>
      <Spacer />
      {rows.map((row, i) => (
        // Each row opens its own object (medium size; the small size only has `widgetURL`).
        <Link key={String(i)} destination={row.url}>
          <HStack spacing={4}>
            <Image systemName={row.symbol as never} color={tint} size={12} />
            {row.time ? (
              <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), monospacedDigit(), lineLimit(1)]}>
                {row.time}
              </Text>
            ) : null}
            <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>{row.title}</Text>
          </HStack>
        </Link>
      ))}
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
  const container = [containerBackground({ type: 'hierarchical', style: 'quinary' }, 'widget'), widgetURL(props.url)];
  // The cover photo beside the text in the medium size; the small one has no room for both.
  if (family === 'systemMedium' && props.cover) {
    return (
      <HStack spacing={12} modifiers={container}>
        {content}
        <Image
          uiImage={props.cover}
          modifiers={[
            resizable(),
            aspectRatio({ contentMode: 'fill' }),
            frame({ minWidth: 120, maxWidth: 120, maxHeight: 10000 }),
            clipShape('roundedRectangle', 12),
            // A clear or tinted Home Screen otherwise paints this opaque photo as a solid white block.
            widgetAccentedRenderingMode('fullColor'),
          ]}
        />
      </HStack>
    );
  }
  return <VStack modifiers={container}>{content}</VStack>;
};

export default createWidget<Pickable<NextWidgetProps>, CollectionConfiguration>('NextWidget', NextWidget);
