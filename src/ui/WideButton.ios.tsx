import { Button } from '@expo/ui';
import { frame } from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps } from 'react';

import { Text } from './Text';

/**
 * A filled button across its card (the sign-in actions). SwiftUI sizes a prominent button to its label, so the
 * label itself takes the full width.
 */
export function WideButton({ label, ...props }: Omit<ComponentProps<typeof Button>, 'modifiers' | 'children'>) {
  return (
    <Button {...props}>
      <Text modifiers={[frame({ maxWidth: Infinity })]}>{label ?? ''}</Text>
    </Button>
  );
}
