import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { useColorScheme } from 'react-native';

import { tr } from '@/i18n';
import type { PlanModeTabsProps } from './PlanModeTabs';
import { Text } from './Text';
import { ACCENT_SEED } from './accent';

export function PlanModeTabs({ value, onChange }: PlanModeTabsProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={scheme}
      seedColor={ACCENT_SEED}
      style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 8 }}>
      <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
        <SegmentedButton selected={value === 'day'} onClick={() => onChange('day')}>
          <SegmentedButton.Label>
            <Text>{tr('collection.dayView')}</Text>
          </SegmentedButton.Label>
        </SegmentedButton>
        <SegmentedButton selected={value === 'overview'} onClick={() => onChange('overview')}>
          <SegmentedButton.Label>
            <Text>{tr('today.allDays')}</Text>
          </SegmentedButton.Label>
        </SegmentedButton>
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
