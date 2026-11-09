import { FieldGroup } from '@expo/ui';
import type { ReactNode } from 'react';

/** Without `onRefresh` it is a plain group; on Android it still lets photo cards sit between sections. */
export type RefreshableFieldGroupProps = { children?: ReactNode; onRefresh?: () => Promise<void> };

/** `FieldGroup` with pull-to-refresh on iOS and Android (see the platform files); plain elsewhere. */
export function RefreshableFieldGroup({ children }: RefreshableFieldGroupProps) {
  return <FieldGroup>{children}</FieldGroup>;
}
