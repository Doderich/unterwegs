import { Button, FieldGroup, ListItem } from '@expo/ui';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { z } from 'zod';
import type { apiKeySchema } from '@/api/schemas';
import { useClient, useCredentials, useSession } from '@/auth/session';
import { useOnlineAction } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { copyRow, RowIcon, useCopy, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { useTextPrompt } from '@/ui/TextPrompt';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';
import { readsAffectedBy } from '@/data/affected';
import { queryKeys } from '@/data/queries';

type Key = z.infer<typeof apiKeySchema>;

export default function ApiKeysScreen() {
  const client = useClient();
  const credentials = useCredentials();
  const { signOut } = useSession();
  const action = useOnlineAction();
  const rt = useRowTheme();
  const prompt = useTextPrompt(rt);
  const copy = useCopy();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Never persist credentials or key listings to the offline query cache.
  const keys = useQuery({
    queryKey: queryKeys.apiKeys,
    queryFn: () => client.listApiKeys(),
    enabled: action.online,
    retry: false,
    gcTime: 0,
    meta: { persist: false },
  });
  const isOwn = (key: Key) => !!key.key_prefix && !!credentials?.apiKey.startsWith(key.key_prefix);
  const create = () =>
    prompt.open({
      title: tr('accountKeys.newApiKey'),
      value: '',
      placeholder: tr('accountKeys.nameForDeviceOrApplication'),
      onSave: async (name) => {
        if (!name.trim() || busy) return;
        setBusy(true);
        const result = await action.run(() => client.edit.createApiKey(name.trim()), readsAffectedBy('apiKeys'));
        setBusy(false);
        if (result) setNewKey(result.key);
      },
    });
  const revoke = (key: Key) =>
    Alert.alert(
      tr('accountKeys.revokeApiKeyConfirm'),
      isOwn(key) ? tr('accountKeys.keyForDeviceRevokingIt') : tr('accountKeys.associatedDeviceOrApplicationWill'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('accountKeys.revoke'),
          style: 'destructive',
          onPress: async () => {
            if (busy) return;
            setBusy(true);
            // DELETE returns null on success, so use an explicit success marker.
            const result = await action.run(
              async () => {
                await client.edit.deleteApiKey(key.id);
                return true;
              },
              isOwn(key) ? [] : readsAffectedBy('apiKeys'),
            );
            if (result && isOwn(key)) await signOut();
            setBusy(false);
          },
        },
      ],
    );
  return (
    <>
      <Stack.Screen options={{ title: tr('common.apiKeys') }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          {newKey ? (
            <FieldGroup.Section title={tr('accountKeys.newKeyVisibleOnlyNow')}>
              {copyRow(rt, copy, { label: tr('accountKeys.tapCopy'), value: newKey })}
              <FieldGroup.SectionFooter>
                <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                  {tr('accountKeys.copyKeySafePlaceNow')}
                </Text>
              </FieldGroup.SectionFooter>
              <Button label={tr('accountKeys.hideKey')} variant="text" onPress={() => setNewKey(null)} />
            </FieldGroup.Section>
          ) : null}
          <FieldGroup.Section>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="add" />}
              onPress={action.online && !busy ? create : undefined}>
              {tr('accountKeys.createApiKey')}
            </ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('accountKeys.devicesApplications')}>
            {!action.online ? (
              <Text>{tr('common.onlyWithInternet')}</Text>
            ) : keys.isPending ? (
              <Text>{tr('common.loading')}</Text>
            ) : keys.isError ? (
              <ListItem colors={rt.listColors} onPress={() => void keys.refetch()}>
                {tr('accountKeys.couldNotLoadKeysTap')}
              </ListItem>
            ) : !keys.data?.length ? (
              <Text>{tr('accountKeys.noApiKeys')}</Text>
            ) : null}
            {(keys.data ?? []).map((key) => (
              <ListItem
                key={key.id}
                colors={rt.listColors}
                leading={<RowIcon name="key" />}
                supportingText={
                  <Sub>
                    {[key.key_prefix, isOwn(key) ? tr('accountKeys.device') : null, tr('accountKeys.tapRevoke')]
                      .filter(Boolean)
                      .join(' · ')}
                  </Sub>
                }
                onPress={action.online && !busy ? () => revoke(key) : undefined}>
                {key.name || tr('accountKeys.untitled')}
              </ListItem>
            ))}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      {prompt.sheet}
    </>
  );
}
