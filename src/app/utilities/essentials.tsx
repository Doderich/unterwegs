import { Button, FieldGroup } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { tr } from '@/i18n';
import { Host } from '@/ui/Host';
import { androidToolbarIcon } from '@/ui/icons';
import { copyRow, useCopy, useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { useEssentials } from '@/utilities/travelStore';

export default function EssentialsScreen() {
  const rt = useRowTheme();
  const data = useEssentials();
  const copy = useCopy();
  const populated = !!(data.contacts.trim() || data.insurance.trim() || data.phrases.trim());
  return (
    <>
      {populated ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('edit')}
            accessibilityLabel={tr('common.edit')}
            onPress={() => router.push('/utilities/essentials-edit')}>
            {tr('common.edit')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          {data.contacts.trim() ? (
            <FieldGroup.Section title={tr('essentials.contacts')}>
              {copyRow(rt, copy, { icon: 'group', label: tr('essentials.contacts'), value: data.contacts })}
            </FieldGroup.Section>
          ) : null}
          {data.insurance.trim() ? (
            <FieldGroup.Section title={tr('essentials.insurance')}>
              {copyRow(rt, copy, { icon: 'file', label: tr('essentials.insurance'), value: data.insurance })}
            </FieldGroup.Section>
          ) : null}
          {data.phrases.trim() ? (
            <FieldGroup.Section title={tr('essentials.phrases')}>
              {copyRow(rt, copy, { icon: 'note', label: tr('essentials.phrases'), value: data.phrases })}
            </FieldGroup.Section>
          ) : null}
          {!populated ? (
            <FieldGroup.Section>
              <Text>{tr('essentials.empty')}</Text>
              <Button
                label={tr('essentials.add')}
                variant="text"
                onPress={() => router.push('/utilities/essentials-edit')}
              />
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
    </>
  );
}
