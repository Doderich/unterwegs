import { FieldGroup } from '@expo/ui';
import { Alert, Linking, Platform } from 'react-native';

import { requestRemindersPermission } from '@/glances/notifications';
import { tr } from '@/i18n';
import { reminderRows } from '@/screens/settings/options';
import { updateSettings, useSettings } from '@/settings/store';
import { Host } from '@/ui/Host';
import { switchRow, useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';

/** Local reminders from the offline copy, each kind on its own, and the iOS travel-day Live Activity. */
export default function ReminderSettingsScreen() {
  const rt = useRowTheme();
  const settings = useSettings();

  /** Turning reminders on asks for the permission; when the system refuses, its settings are the only way. */
  async function toggleReminders(on: boolean) {
    if (!on) return updateSettings({ reminders: false });
    if (await requestRemindersPermission()) return updateSettings({ reminders: true });
    Alert.alert(tr('settings.remindersDenied'), tr('settings.remindersDeniedHint'), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('settings.openSystemSettings'), onPress: () => void Linking.openSettings() },
    ]);
  }

  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup>
        <FieldGroup.Section>
          {switchRow(rt, {
            label: tr('settings.remindersOn'),
            value: settings.reminders,
            onChange: (on) => void toggleReminders(on),
          })}
          <FieldGroup.SectionFooter>
            <Text textStyle={{ fontSize: 13, color: rt.colors.secondary }}>{tr('settings.remindersHint')}</Text>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>
        {settings.reminders ? (
          <FieldGroup.Section>
            {reminderRows().map(({ kind, label }) =>
              switchRow(rt, {
                label,
                value: settings.reminderKinds[kind],
                onChange: (value) => updateSettings({ reminderKinds: { ...settings.reminderKinds, [kind]: value } }),
              }),
            )}
          </FieldGroup.Section>
        ) : null}
        {Platform.OS === 'ios' ? (
          <FieldGroup.Section>
            {switchRow(rt, {
              label: tr('settings.travelActivity'),
              hint: tr('settings.travelActivityHint'),
              value: settings.travelActivity,
              onChange: (travelActivity) => updateSettings({ travelActivity }),
            })}
          </FieldGroup.Section>
        ) : null}
      </FieldGroup>
    </Host>
  );
}
