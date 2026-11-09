import { FieldGroup, Icon, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { tr } from '@/i18n';
import { Host } from '@/ui/Host';
import { androidToolbarIcon, icons } from '@/ui/icons';
import { useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { unitOptions } from '@/utilities/unitOptions';
import { belongsToGroup } from '@/utilities/units';
import { saveUnitPair, useTravelPreferences } from '@/utilities/travelStore';

export default function UnitPickerScreen() {
  const { side } = useLocalSearchParams<{ side?: string }>();
  const prefs = useTravelPreferences();
  const group = prefs.unitGroup;
  const pair = prefs.unitPairs[group];
  const key = side === 'quote' ? 'to' : 'from';
  const rt = useRowTheme();
  const [error, setError] = useState(false);
  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('close')}
          accessibilityLabel={tr('common.cancel')}
          onPress={() => router.back()}>
          {tr('common.cancel')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {unitOptions(group).map((option) => (
              <ListItem
                key={option.value}
                colors={rt.listColors}
                trailing={
                  pair[key] === option.value ? <Icon name={icons.check} size={22} color={rt.colors.tint} /> : undefined
                }
                onPress={() => {
                  if (
                    !belongsToGroup(group, option.value) ||
                    !belongsToGroup(group, pair.from) ||
                    !belongsToGroup(group, pair.to)
                  )
                    return;
                  try {
                    const other = key === 'from' ? pair.to : pair.from;
                    const from = option.value === other ? pair.to : key === 'from' ? option.value : pair.from;
                    const to = option.value === other ? pair.from : key === 'to' ? option.value : pair.to;
                    saveUnitPair(group, from, to);
                    router.back();
                  } catch {
                    setError(true);
                  }
                }}>
                {option.label}
              </ListItem>
            ))}
            {error ? <Text>{tr('travelTools.saveFailed')}</Text> : null}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}
