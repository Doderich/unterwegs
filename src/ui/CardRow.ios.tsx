import { FieldGroup } from '@expo/ui';
import { RNHostView, VStack } from '@expo/ui/swift-ui';
import { listRowBackground, listRowInsets } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';

/** The row gives the card its width (`width` from `cardRowWidth` is undefined on iOS). */
export const cardRowWidth = (_windowWidth: number): number | undefined => undefined;

/** A React Native card shown edge to edge in a `FieldGroup`: no row padding, no row background. */
export function CardRow({ children, title }: { children: ReactElement; title?: string }) {
  return (
    <FieldGroup.Section title={title}>
      <VStack modifiers={[listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 }), listRowBackground('clear')]}>
        <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
      </VStack>
    </FieldGroup.Section>
  );
}
