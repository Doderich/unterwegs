import type { ListItem } from '@expo/ui';
import { Button, HStack, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, contentShape, disabled, fixedSize, frame, padding, shapes } from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps, ReactNode } from 'react';

import { Text } from './Text';
import { useColors } from './theme';

type Props = Pick<
  ComponentProps<typeof ListItem>,
  'children' | 'leading' | 'trailing' | 'supportingText' | 'onPress' | 'colors' | 'testID'
>;

/** A sheet has no Form row insets: put spacing and the hit rectangle inside the native button label. */
export function SheetRow({ children, leading, trailing, supportingText, onPress, colors, testID }: Props) {
  const palette = useColors();
  const text = (value: ReactNode, secondary = false) =>
    typeof value === 'string' || typeof value === 'number' ? (
      <Text
        textStyle={{
          color: secondary
            ? palette.secondary
            : typeof colors?.contentColor === 'string'
              ? colors.contentColor
              : palette.text,
        }}>
        {String(value)}
      </Text>
    ) : (
      value
    );
  return (
    <Button onPress={onPress} testID={testID} modifiers={[buttonStyle('plain'), disabled(!onPress)]}>
      <HStack
        alignment="top"
        spacing={16}
        modifiers={[
          frame({ minHeight: 28, maxWidth: Infinity, alignment: 'leading' }),
          padding({ top: 12, bottom: 12, leading: 8, trailing: 8 }),
          contentShape(shapes.rectangle()),
        ]}>
        {leading ? <VStack modifiers={[frame({ width: 24 }), frame({ minHeight: 24 })]}>{leading}</VStack> : null}
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[
            frame({ maxWidth: Infinity, alignment: 'leading' }),
            fixedSize({ horizontal: false, vertical: true }),
          ]}>
          {text(children)}
          {supportingText ? text(supportingText, true) : null}
        </VStack>
        {trailing ? <VStack modifiers={[frame({ width: 24 }), frame({ minHeight: 24 })]}>{trailing}</VStack> : null}
      </HStack>
    </Button>
  );
}
