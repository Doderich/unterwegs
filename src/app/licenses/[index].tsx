import { FieldGroup } from '@expo/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

import { tr } from '@/i18n';
import { licenses } from '@/legal/licenses';
import { Host } from '@/ui/Host';
import { infoRow, linkRow, useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { useColors } from '@/ui/theme';

/** One package's licence text, or its licence name and repository when the package ships no text. */
export default function LicenseScreen() {
  const { index } = useLocalSearchParams<{ index: string }>();
  const rt = useRowTheme();
  const colors = useColors();
  const entry = licenses[Number(index)];
  if (!entry) return null;
  return (
    <Host style={{ flex: 1 }}>
      <Stack.Screen options={{ title: entry.name }} />
      <FieldGroup>
        <FieldGroup.Section>
          {infoRow(rt, { icon: 'file', label: tr('licenses.license'), value: entry.license })}
          {entry.version ? infoRow(rt, { icon: 'time', label: tr('licenses.version'), value: entry.version }) : null}
          {entry.url ? linkRow(rt, { label: tr('licenses.source'), url: entry.url }) : null}
        </FieldGroup.Section>
        <FieldGroup.Section>
          <Text
            textStyle={{
              fontSize: 13,
              color: colors.text,
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            }}>
            {entry.text ?? tr('licenses.noText', { license: entry.license })}
          </Text>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
