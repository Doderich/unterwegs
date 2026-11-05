import { Button, FieldGroup, TextInput } from '@expo/ui';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useClient, useSession } from '@/auth/session';
import { useUser } from '@/data/queries';
import { useOnlineAction } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';

export default function DeleteAccountScreen() {
  const client = useClient();
  const user = useUser();
  const { signOut } = useSession();
  const action = useOnlineAction();
  const rt = useRowTheme();
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const needsPassword = user.data?.has_password && !user.data.disable_password;
  const allowed =
    !!user.data &&
    !user.data.is_staff &&
    confirmation === user.data.username &&
    (!needsPassword || !!password) &&
    action.online &&
    !busy;
  const remove = () =>
    Alert.alert(tr('accountDelete.permanentlyDeleteAccountConfirm'), tr('accountDelete.accountAllAssociatedDataWill'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('accountDelete.deletePermanently'),
        style: 'destructive',
        onPress: async () => {
          if (!allowed) return;
          setBusy(true);
          const result = await action.run(async () => {
            await client.edit.deleteAccount(confirmation, password);
            return true;
          });
          setPassword('');
          if (result) await signOut({ wipe: true });
          setBusy(false);
        },
      },
    ]);
  return (
    <>
      <Stack.Screen options={{ title: tr('common.deleteAccount') }} />
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section>
            <Text textStyle={{ color: rt.colors.danger }}>{tr('accountDelete.accountAllAssociatedDataWill')}</Text>
            <Text>{tr('accountDelete.enterUsernameConfirmName', { name: user.data?.username ?? '…' })}</Text>
            <TextInput
              defaultValue=""
              onChangeText={setConfirmation}
              placeholder={tr('common.username')}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {needsPassword ? (
              <TextInput
                defaultValue=""
                onChangeText={setPassword}
                placeholder={tr('common.password')}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}
            <Button
              label={busy ? tr('accountDelete.deleting') : tr('accountDelete.permanentlyDeleteAccount')}
              variant="text"
              disabled={!allowed}
              onPress={remove}
            />
          </FieldGroup.Section>
        </FieldGroup>
      </FormHost>
    </>
  );
}
