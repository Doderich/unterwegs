import { RNHostView } from '@expo/ui';
import type { ReactElement } from 'react';

/** Card width inside `RefreshableFieldGroup` (16 dp content padding on Android). */
export const cardRowWidth = (windowWidth: number): number | undefined => windowWidth - 32;

/**
 * A React Native card shown edge to edge between sections. Needs `RefreshableFieldGroup` on Android
 * (`FieldGroup` would wrap it in a padded row).
 */
export function CardRow({ children }: { children: ReactElement }) {
  return <RNHostView matchContents>{children}</RNHostView>;
}
