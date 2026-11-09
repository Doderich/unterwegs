import { Button, FieldGroup } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { androidToolbarIcon } from '@/ui/icons';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';
import { useRowTheme } from '@/ui/rows';
import { typeScale } from '@/ui/typeScale';
import { clearEssentials, saveEssentials, useEssentials } from '@/utilities/travelStore';

export default function EditEssentialsScreen() {
  const rt = useRowTheme();
  const saved = useEssentials();
  const [contacts, setContacts] = useState(saved.contacts);
  const [insurance, setInsurance] = useState(saved.insurance);
  const [phrases, setPhrases] = useState(saved.phrases);
  const [error, setError] = useState(false);
  const save = () => {
    try {
      saveEssentials({ contacts, insurance, phrases });
      router.back();
    } catch {
      setError(true);
    }
  };
  const clear = () =>
    Alert.alert(tr('essentials.delete'), tr('essentials.deleteConfirm'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('common.delete'),
        style: 'destructive',
        onPress: () => {
          try {
            clearEssentials();
            router.back();
          } catch {
            setError(true);
          }
        },
      },
    ]);
  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon={androidToolbarIcon('check')} accessibilityLabel={tr('common.save')} onPress={save}>
          {tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section title={tr('essentials.contacts')}>
            <TextInput
              defaultValue={contacts}
              onChangeText={setContacts}
              multiline
              maxLength={5000}
              accessibilityLabel={tr('essentials.contacts')}
              placeholder={tr('essentials.contactsPlaceholder')}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('essentials.insurance')}>
            <TextInput
              defaultValue={insurance}
              onChangeText={setInsurance}
              multiline
              maxLength={5000}
              accessibilityLabel={tr('essentials.insurance')}
              placeholder={tr('essentials.insurancePlaceholder')}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('essentials.phrases')}>
            <TextInput
              defaultValue={phrases}
              onChangeText={setPhrases}
              multiline
              maxLength={5000}
              accessibilityLabel={tr('essentials.phrases')}
              placeholder={tr('essentials.phrasesPlaceholder')}
            />
            <FieldGroup.SectionFooter>
              <Text textStyle={{ ...typeScale.supporting, color: rt.colors.secondary }}>
                {tr('essentials.localOnly')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          {error ? (
            <FieldGroup.Section>
              <Text textStyle={{ color: rt.colors.danger }}>{tr('travelTools.saveFailed')}</Text>
            </FieldGroup.Section>
          ) : null}
          {saved.contacts || saved.insurance || saved.phrases ? (
            <FieldGroup.Section>
              <Button label={tr('essentials.delete')} variant="text" onPress={clear} />
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
    </>
  );
}
