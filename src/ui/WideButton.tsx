import { Button } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps } from 'react';

/** A filled button across its card (the sign-in actions): the main action of a form reads as one wide bar. */
export function WideButton(props: Omit<ComponentProps<typeof Button>, 'modifiers' | 'children'>) {
  return <Button {...props} modifiers={[fillMaxWidth()]} />;
}
