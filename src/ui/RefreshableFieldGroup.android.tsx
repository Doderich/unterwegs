import { LazyColumn, PullToRefreshBox, useMaterialColors } from '@expo/ui/jetpack-compose';
import { background, fillMaxSize } from '@expo/ui/jetpack-compose/modifiers';
import { useCallback, useState } from 'react';

import type { RefreshableFieldGroupProps } from './RefreshableFieldGroup';

/**
 * `FieldGroup` layout (same spacing and background) with pull-to-refresh; the promise drives the indicator.
 * Unlike `FieldGroup`, children that aren't sections are not wrapped in a padded row, so a
 * full-width card can sit between sections.
 */
export function RefreshableFieldGroup({ children, onRefresh }: RefreshableFieldGroupProps) {
  const colors = useMaterialColors();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);
  return (
    <PullToRefreshBox
      modifiers={[fillMaxSize()]}
      isRefreshing={isRefreshing}
      onRefresh={() => void refresh()}
      contentAlignment="topCenter">
      <LazyColumn
        verticalArrangement={{ spacedBy: 24 }}
        contentPadding={{ start: 16, end: 16, top: 16, bottom: 16 }}
        modifiers={[fillMaxSize(), background(colors.surface)]}>
        {children}
      </LazyColumn>
    </PullToRefreshBox>
  );
}
