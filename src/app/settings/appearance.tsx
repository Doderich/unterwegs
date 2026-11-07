import { FieldGroup } from '@expo/ui';
import { Platform } from 'react-native';

import { tr } from '@/i18n';
import { languageOptions, themeOptions } from '@/screens/settings/options';
import { updateSettings, useSettings, type Settings } from '@/settings/store';
import { Host } from '@/ui/Host';
import { switchRow, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';

/** Language, light/dark and (iOS) tab labels. */
export default function AppearanceSettingsScreen() {
  const rt = useRowTheme();
  const settings = useSettings();
  const languageSelect = useSelect(rt, {
    title: tr('settings.language'),
    label: tr('settings.language'),
    value: settings.language,
    onChange: (v) => updateSettings({ language: v as Settings['language'] }),
    options: languageOptions(),
  });
  const themeSelect = useSelect(rt, {
    title: tr('settings.theme'),
    label: tr('settings.theme'),
    value: settings.theme,
    onChange: (v) => updateSettings({ theme: v as Settings['theme'] }),
    options: themeOptions(),
  });
  return (
    <>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {languageSelect.row}
            {themeSelect.row}
            {Platform.OS === 'ios'
              ? switchRow(rt, {
                  label: tr('settings.showTabLabels'),
                  hint: tr('settings.showTabLabelsHint'),
                  value: settings.showTabLabels,
                  onChange: (showTabLabels) => updateSettings({ showTabLabels }),
                })
              : null}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      {languageSelect.sheet}
      {themeSelect.sheet}
    </>
  );
}
