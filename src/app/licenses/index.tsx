import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';

import { tr } from '@/i18n';
import { licenses } from '@/legal/licenses';
import { Host } from '@/ui/Host';
import { useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { useColors } from '@/ui/theme';

/** Open-source software in the app, with licence and version; a row opens the licence text. */
export default function LicensesScreen() {
  const rt = useRowTheme();
  const colors = useColors();
  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section>
          {licenses.map((entry, i) => (
            <ListItem
              key={`${entry.name}@${entry.version ?? ''}`}
              colors={rt.listColors}
              supportingText={
                <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                  {[entry.version, entry.license].filter(Boolean).join(' · ')}
                </Text>
              }
              onPress={() => router.push({ pathname: '/licenses/[index]', params: { index: String(i) } })}>
              {entry.name}
            </ListItem>
          ))}
          <FieldGroup.SectionFooter>
            <Text textStyle={{ fontSize: 13, color: colors.secondary }}>{tr('licenses.footer')}</Text>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
