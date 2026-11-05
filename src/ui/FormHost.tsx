import { Toolbar } from '@expo/ui/swift-ui';
import type { ReactNode } from 'react';

import { useColors } from './theme';
import { Host } from './Host';

/**
 * SwiftUI forms handle keyboard avoidance themselves. `keyboardBar` is a `ToolbarItem placement="keyboard"`
 * (e.g. the Markdown formatting bar); SwiftUI docks it above the keyboard.
 */
export function FormHost({ children, keyboardBar }: { children: ReactNode; keyboardBar?: ReactNode }) {
  const colors = useColors();
  return (
    <Host seedColor={colors.tint} style={{ flex: 1 }}>
      {keyboardBar ? (
        <Toolbar>
          {children}
          <Toolbar.Content>{keyboardBar}</Toolbar.Content>
        </Toolbar>
      ) : (
        children
      )}
    </Host>
  );
}
