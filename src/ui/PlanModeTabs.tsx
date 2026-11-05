import { Picker } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { tr } from '@/i18n';
import { Host } from './Host';
import { Text } from './Text';

export type PlanModeTabsProps = { value: 'day' | 'overview'; onChange: (value: 'day' | 'overview') => void };

export function PlanModeTabs({ value, onChange }: PlanModeTabsProps) {
  return (
    <Host ignoreSafeArea="container" style={{ height: 44, marginHorizontal: 16, marginBottom: 8 }}>
      <Picker
        label={tr('collection.plan')}
        selection={value}
        onSelectionChange={onChange}
        modifiers={[pickerStyle('segmented')]}>
        <Text modifiers={[tag('day')]}>{tr('collection.dayView')}</Text>
        <Text modifiers={[tag('overview')]}>{tr('today.allDays')}</Text>
      </Picker>
    </Host>
  );
}
