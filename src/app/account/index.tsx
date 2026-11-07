import { FieldGroup, ListItem } from '@expo/ui';
import * as WebBrowser from 'expo-web-browser';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { User } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { useUser } from '@/data/queries';
import { changedFields } from '@/data/selectors';
import { useOnlineAction } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { currencyOptions } from '@/ui/forms';
import { FormHost } from '@/ui/FormHost';
import { androidToolbarIcon } from '@/ui/icons';
import { RowIcon, switchRow, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { useServerFile } from '@/ui/serverFile';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';
import { TextInput } from '@/ui/TextInput';
import { readsAffectedBy } from '@/data/affected';

export default function AccountScreen() {
  const user = useUser();
  const rt = useRowTheme();
  return (
    <>
      <Stack.Screen options={{ title: tr('common.manageAccount') }} />
      {user.data ? (
        <AccountForm key={user.data.uuid ?? user.data.username} user={user.data} />
      ) : (
        <Host style={{ flex: 1 }}>
          <FieldGroup>
            <FieldGroup.Section>
              <ListItem colors={rt.listColors} onPress={() => void user.refetch()}>
                {user.isError ? tr('account.couldNotLoadAccountTap') : tr('common.loading')}
              </ListItem>
            </FieldGroup.Section>
          </FieldGroup>
        </Host>
      )}
    </>
  );
}

function AccountForm({ user }: { user: User }) {
  const client = useClient();
  const rt = useRowTheme();
  const action = useOnlineAction();
  const [username, setUsername] = useState(user.username);
  const [firstName, setFirstName] = useState(user.first_name ?? '');
  const [lastName, setLastName] = useState(user.last_name ?? '');
  const [isPublic, setPublic] = useState(!!user.public_profile);
  const [measurement, setMeasurement] = useState(user.measurement_system ?? 'metric');
  const [currency, setCurrency] = useState(user.default_currency ?? 'EUR');
  const [dateFormat, setDateFormat] = useState(user.date_format ?? 'locale');
  const [busy, setBusy] = useState(false);
  const serverFile = useServerFile();
  const units = useSelect(rt, {
    title: tr('account.unitsOfMeasurement'),
    label: tr('account.unitsOfMeasurement'),
    value: measurement,
    options: [
      { value: 'metric', label: tr('account.metric') },
      { value: 'imperial', label: tr('account.imperial') },
    ],
    onChange: (v) => setMeasurement(v as 'metric' | 'imperial'),
  });
  const currencies = useSelect(rt, {
    title: tr('account.defaultCurrency'),
    label: tr('account.defaultCurrency'),
    value: currency,
    options: currencyOptions(currency),
    onChange: setCurrency,
  });
  const dates = useSelect(rt, {
    title: tr('account.websiteDateFormat'),
    label: tr('account.websiteDateFormat'),
    value: dateFormat,
    options: [
      { value: 'locale', label: tr('common.system') },
      { value: 'dmy', label: 'DD.MM.YYYY' },
      { value: 'mdy', label: 'MM/DD/YYYY' },
      { value: 'ymd', label: 'YYYY-MM-DD' },
    ],
    onChange: setDateFormat,
  });
  const save = async () => {
    if (busy || !username.trim()) return;
    setBusy(true);
    const input = {
      username: username.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      public_profile: isPublic,
      measurement_system: measurement,
      default_currency: currency,
      date_format: dateFormat,
    };
    const result = await action.run(
      () => client.edit.updateAccount(changedFields(user, input)),
      readsAffectedBy('account'),
    );
    setBusy(false);
    if (result) router.back();
  };
  const confirmSave = () =>
    user.public_profile && !isPublic
      ? Alert.alert(tr('account.makeProfilePrivateConfirm'), tr('account.leavesAllTripsSharedWith'), [
          { text: tr('common.cancel'), style: 'cancel' },
          { text: tr('account.makePrivateSave'), style: 'destructive', onPress: () => void save() },
        ])
      : void save();
  const openWebsite = async (tab: string) => {
    try {
      await WebBrowser.openBrowserAsync(`${client.baseUrl}/settings?tab=${tab}`);
    } catch {
      Alert.alert(tr('common.notAvailable'), tr('account.couldNotOpenWebsite'));
    }
  };
  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={busy || !action.online || !username.trim()}
          onPress={confirmSave}>
          {busy ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section title={tr('account.profile')}>
            <TextInput
              defaultValue={username}
              onChangeText={setUsername}
              placeholder={tr('common.username')}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput defaultValue={firstName} onChangeText={setFirstName} placeholder={tr('account.firstName')} />
            <TextInput defaultValue={lastName} onChangeText={setLastName} placeholder={tr('account.lastName')} />
            {switchRow(rt, { label: tr('account.publicProfile'), value: isPublic, onChange: setPublic })}
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('account.accountSettings')}>
            {units.row}
            {currencies.row}
            {dates.row}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                {tr('account.thesePreferencesApplyServerAccount')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('common.integrations')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="link" />}
              onPress={() => router.push('/integrations')}>
              {tr('common.manageIntegrations')}
            </ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('account.accessSecurity')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="key" />}
              onPress={() => router.push('/account/keys')}>
              {tr('account.manageApiKeys')}
            </ListItem>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="link" />}
              onPress={action.online ? () => void openWebsite('security') : undefined}>
              {tr('account.passwordTwofactorAuthentication')}
            </ListItem>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="link" />}
              onPress={action.online ? () => void openWebsite('emails') : undefined}>
              {tr('account.manageEmailAddresses')}
            </ListItem>
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                {tr('account.securityEmailOpenServerWebsite')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('account.backup')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="file" />}
              onPress={
                action.online && !serverFile.busy
                  ? () =>
                      void serverFile.share(
                        '/api/backup/export',
                        'unterwegs-konto.zip',
                        'application/zip',
                        tr('account.accountBackup'),
                      )
                  : undefined
              }>
              {serverFile.busy ? tr('common.loading') : tr('account.exportAllAccountDataZip')}
            </ListItem>
            <ListItem colors={rt.listColors} onPress={action.online ? () => void openWebsite('data') : undefined}>
              {tr('account.restoreBackupOnWebsite')}
            </ListItem>
          </FieldGroup.Section>
          {user.is_staff ? (
            <FieldGroup.Section title={tr('account.serverAdministration')}>
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="settings" />}
                onPress={action.online ? () => void openWebsite('admin') : undefined}>
                {tr('account.manageServerOnWebsite')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
          {!user.is_staff ? (
            <FieldGroup.Section>
              <ListItem
                colors={{ ...rt.listColors, contentColor: rt.colors.danger }}
                leading={<RowIcon name="delete" color={rt.colors.danger} />}
                onPress={() => router.push('/account/delete')}>
                {tr('common.deleteAccount')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
          {!action.online ? (
            <FieldGroup.Section>
              <Text>{tr('common.onlyWithInternet')}</Text>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {units.sheet}
      {currencies.sheet}
      {dates.sheet}
    </>
  );
}
