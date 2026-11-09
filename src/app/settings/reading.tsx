import { FieldGroup } from '@expo/ui';

import { tr } from '@/i18n';
import { textSizeOptions } from '@/screens/settings/options';
import { updateSettings, useSettings, type Settings } from '@/settings/store';
import { Host } from '@/ui/Host';
import { switchRow, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { Text } from '@/ui/Text';

/** Text size, bold, contrast, motion and haptics: everything that makes the app easier to read and use. */
export default function ReadingSettingsScreen() {
  const rt = useRowTheme();
  const settings = useSettings();
  const textSizeSelect = useSelect(rt, {
    title: tr('settings.textSize'),
    label: tr('settings.textSize'),
    value: settings.textSize,
    onChange: (v) => updateSettings({ textSize: v as Settings['textSize'] }),
    options: textSizeOptions(),
  });
  return (
    <>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {textSizeSelect.row}
            {/* Live preview: follows the setting the moment it changes. */}
            <Text textStyle={{ color: rt.colors.text }}>{tr('settings.textSizePreview')}</Text>
          </FieldGroup.Section>
          <FieldGroup.Section>
            {switchRow(rt, {
              label: tr('settings.boldText'),
              value: settings.boldText,
              onChange: (boldText) => updateSettings({ boldText }),
            })}
            {switchRow(rt, {
              label: tr('settings.increaseContrast'),
              value: settings.highContrast,
              onChange: (highContrast) => updateSettings({ highContrast }),
            })}
            {switchRow(rt, {
              label: tr('settings.reduceMotion'),
              value: settings.reduceMotion,
              onChange: (reduceMotion) => updateSettings({ reduceMotion }),
            })}
            {switchRow(rt, {
              label: tr('settings.hapticFeedback'),
              value: settings.haptics,
              onChange: (haptics) => updateSettings({ haptics }),
            })}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: rt.colors.secondary }}>
                {tr('settings.systemUsesPhonesSettings')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      {textSizeSelect.sheet}
    </>
  );
}
