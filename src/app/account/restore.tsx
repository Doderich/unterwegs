import { FieldGroup, ListItem } from '@expo/ui';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { UploadFile } from '@/api/client';
import { useClient } from '@/auth/session';
import { useUser } from '@/data/queries';
import { useOnlineAction } from '@/data/useOnlineAction';
import { useOutbox } from '@/data/useOutbox';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useServerFile } from '@/ui/serverFile';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';

/** The kinds the summary lists, in this order; the server counts more (images, trails, …), which stay out. */
const summaryRows = (): [string, string][] => [
  ['collections', tr('accountRestore.kindCollections')],
  ['locations', tr('accountRestore.kindLocations')],
  ['lodging', tr('accountRestore.kindLodging')],
  ['transportation', tr('accountRestore.kindTransportation')],
  ['notes', tr('accountRestore.kindNotes')],
  ['checklists', tr('accountRestore.kindChecklists')],
];

/**
 * Restores an account backup ZIP. The server deletes everything the account owns first and imports the backup with
 * new ids, so this asks like account deletion does: the username, then an alert. Waiting offline edits would be
 * sent to objects that no longer exist, so it waits until the outbox is empty.
 */
export default function RestoreBackupScreen() {
  const client = useClient();
  const user = useUser();
  const action = useOnlineAction();
  const queryClient = useQueryClient();
  const pending = useOutbox().length;
  const serverFile = useServerFile();
  const rt = useRowTheme();
  const [file, setFile] = useState<UploadFile | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  const allowed =
    !!file && !!user.data && confirmation === user.data.username && pending === 0 && action.online && !busy;

  const pick = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return;
    setFile({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/zip' });
  };

  const restore = () =>
    Alert.alert(tr('accountRestore.restoreConfirm'), tr('accountRestore.replacesEverything'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('accountRestore.replaceData'),
        style: 'destructive',
        onPress: async () => {
          if (!allowed || !file) return;
          setBusy(true);
          const result = await action.run(() => client.edit.restoreBackup(file));
          setBusy(false);
          if (!result) return;
          // Every id changed: the copies of the old collections would open objects that are gone.
          queryClient.removeQueries({ queryKey: ['collection'] });
          void queryClient.invalidateQueries();
          setSummary(result.summary);
        },
      },
    ]);

  if (summary) {
    return (
      <>
        <Stack.Screen options={{ title: tr('accountRestore.title') }} />
        <FormHost>
          <FieldGroup>
            <FieldGroup.Section title={tr('accountRestore.restored')}>
              {summaryRows().map(([kind, label]) => (
                <ListItem key={kind} colors={rt.listColors} trailing={<Text>{String(summary[kind] ?? 0)}</Text>}>
                  {label}
                </ListItem>
              ))}
              <FieldGroup.SectionFooter>
                <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                  {tr('accountRestore.downloadAgain')}
                </Text>
              </FieldGroup.SectionFooter>
            </FieldGroup.Section>
            <FieldGroup.Section>
              <ListItem colors={rt.listColors} onPress={() => router.dismissAll()}>
                {tr('common.done')}
              </ListItem>
            </FieldGroup.Section>
          </FieldGroup>
        </FormHost>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: tr('accountRestore.title') }} />
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section>
            <Text textStyle={{ color: rt.colors.danger }}>{tr('accountRestore.replacesEverything')}</Text>
            <Text textStyle={{ color: rt.colors.secondary }}>{tr('accountRestore.linksChange')}</Text>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('accountRestore.beforeYouStart')}>
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
              {serverFile.busy ? tr('common.loading') : tr('accountRestore.exportCurrentFirst')}
            </ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('accountRestore.backupFile')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="file" />}
              onPress={busy ? undefined : () => void pick()}>
              {file ? file.name : tr('accountRestore.chooseZip')}
            </ListItem>
            <Text>{tr('accountDelete.enterUsernameConfirmName', { name: user.data?.username ?? '…' })}</Text>
            <TextInput
              defaultValue=""
              onChangeText={setConfirmation}
              placeholder={tr('common.username')}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ListItem
              colors={allowed ? { ...rt.listColors, contentColor: rt.colors.danger } : rt.listColors}
              leading={<RowIcon name="refresh" color={allowed ? rt.colors.danger : rt.colors.secondary} />}
              onPress={allowed ? restore : undefined}>
              {busy ? tr('accountRestore.restoring') : tr('accountRestore.restoreBackup')}
            </ListItem>
            {pending > 0 ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                  {tr('accountRestore.waitForOutbox', { count: pending })}
                </Text>
              </FieldGroup.SectionFooter>
            ) : null}
          </FieldGroup.Section>
          {!action.online ? (
            <FieldGroup.Section>
              <Text>{tr('common.onlyWithInternet')}</Text>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
    </>
  );
}
