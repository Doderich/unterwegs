import { FieldGroup } from '@expo/ui';
import { refreshable } from '@expo/ui/swift-ui/modifiers';

import type { RefreshableFieldGroupProps } from './RefreshableFieldGroup';

/** `FieldGroup` with pull-to-refresh; the promise drives the indicator. */
export function RefreshableFieldGroup({ children, onRefresh }: RefreshableFieldGroupProps) {
  return <FieldGroup modifiers={onRefresh ? [refreshable(onRefresh)] : undefined}>{children}</FieldGroup>;
}
