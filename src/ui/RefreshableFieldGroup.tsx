import { FieldGroup } from '@expo/ui';
import type { ReactNode } from 'react';

export type RefreshableFieldGroupProps = { children?: ReactNode; onRefresh: () => Promise<void> };

/** `FieldGroup` with pull-to-refresh on iOS and Android (see the platform files); plain elsewhere. */
export function RefreshableFieldGroup({ children }: RefreshableFieldGroupProps) {
  return <FieldGroup>{children}</FieldGroup>;
}
