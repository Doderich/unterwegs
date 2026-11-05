import { Button, FieldGroup, ListItem, TextInput } from '@expo/ui';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { IntegrationSettings } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { queryKeys, useIntegrations } from '@/data/queries';
import { useOnlineAction } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { integrationServerUrl, isIntegrationKind, type IntegrationKind } from '@/integrations/connection';
import { FormHost } from '@/ui/FormHost';
import { androidToolbarIcon } from '@/ui/icons';
import { infoRow, switchRow, useRowTheme } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

export default function IntegrationScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  if (kind === 'strava') return <StravaSettings />;
  if (!isIntegrationKind(kind)) return <Text>{tr('common.notAvailable')}</Text>;
  return <ServiceSettings kind={kind} />;
}

function ServiceSettings({ kind }: { kind: IntegrationKind }) {
  const client = useClient();
  const action = useOnlineAction();
  const rt = useRowTheme();
  const query = useQuery({
    queryKey: ['integration-settings', kind],
    queryFn: () => client.integrationSettings(kind),
    enabled: action.online,
    retry: false,
    gcTime: 0,
    meta: { persist: false },
  });
  const title = kind === 'immich' ? 'Immich' : kind === 'wanderer' ? 'Wanderer' : 'Endurain';
  return (
    <>
      <Stack.Screen options={{ title }} />
      {!action.online ? (
        <Host style={{ flex: 1 }}>
          <FieldGroup>
            <FieldGroup.Section>
              <Text>{tr('common.onlyWithInternet')}</Text>
            </FieldGroup.Section>
          </FieldGroup>
        </Host>
      ) : query.isPending || query.isError ? (
        <Host style={{ flex: 1 }}>
          <FieldGroup>
            <FieldGroup.Section>
              <ListItem colors={rt.listColors} onPress={() => void query.refetch()}>
                {query.isError ? tr('integrations.couldNotLoadConnectionTap') : tr('common.loading')}
              </ListItem>
            </FieldGroup.Section>
          </FieldGroup>
        </Host>
      ) : (
        <ConnectionForm key={query.data?.id ?? kind} kind={kind} existing={query.data ?? null} />
      )}
    </>
  );
}

function ConnectionForm({ kind, existing }: { kind: IntegrationKind; existing: IntegrationSettings | null }) {
  const client = useClient();
  const action = useOnlineAction();
  const rt = useRowTheme();
  const [server, setServer] = useState(existing?.server_url ?? '');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState(existing?.username ?? '');
  const [password, setPassword] = useState('');
  const [copyLocally, setCopyLocally] = useState(!!existing?.copy_locally);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [secretRevision, setSecretRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const normalized = integrationServerUrl(server);
  const isEndurain = kind === 'endurain';
  const canSave =
    !!normalized && (isEndurain ? !existing && !!username.trim() && !!password : !!existing || !!apiKey.trim());
  const clearSecrets = () => {
    setApiKey('');
    setPassword('');
    setMfaCode('');
    setSecretRevision((n) => n + 1);
  };
  const save = async () => {
    if (busy || (!mfaToken && !canSave)) return;
    setBusy(true);
    if (mfaToken) {
      const result = await action.run(
        () => client.edit.confirmEndurainMfa(mfaToken, mfaCode.trim()),
        [queryKeys.integrations],
      );
      // The server consumes the pending challenge even on a wrong code; restart login after failure.
      setMfaToken(null);
      clearSecrets();
      if (result) router.back();
      else Alert.alert(tr('integrations.connectAgain'), tr('integrations.signinMustRestartedAfterUnsuccessful'));
    } else if (isEndurain) {
      const result = await action.run(
        () => client.edit.connectEndurain(normalized!, username.trim(), password),
        [queryKeys.integrations],
      );
      if (result) {
        clearSecrets();
        if ('mfa_required' in result) setMfaToken(result.mfa_token);
        else router.back();
      }
    } else {
      const result = await action.run(
        () =>
          client.edit.saveIntegration(kind, existing?.id ?? null, {
            server_url: normalized!,
            ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
            ...(kind === 'immich' ? { copy_locally: copyLocally } : {}),
          }),
        [queryKeys.integrations],
      );
      if (result) {
        clearSecrets();
        router.back();
      }
    }
    setBusy(false);
  };
  const disconnect = () =>
    Alert.alert(
      tr('integrations.disconnectIntegrationConfirm'),
      kind === 'immich'
        ? tr('integrations.connectionRemovedOnAllDevices')
        : tr('integrations.connectionRemovedForAccountOn'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('integrations.disconnect'),
          style: 'destructive',
          onPress: async () => {
            if (busy) return;
            setBusy(true);
            const result = await action.run(async () => {
              await client.edit.disconnectIntegration(kind, existing?.id);
              return true;
            }, [queryKeys.integrations]);
            setBusy(false);
            if (result) router.back();
          },
        },
      ],
    );
  return (
    <>
      {!(isEndurain && existing) ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('check')}
            accessibilityLabel={tr('common.save')}
            disabled={busy || !action.online || (mfaToken ? !mfaCode.trim() : !canSave)}
            onPress={() => void save()}>
            {busy ? tr('common.saving') : tr('common.save')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <FormHost>
        <FieldGroup>
          {mfaToken ? (
            <FieldGroup.Section title={tr('integrations.confirmEndurain')}>
              <TextInput
                key={`code-${secretRevision}`}
                defaultValue=""
                onChangeText={setMfaCode}
                placeholder={tr('integrations.verificationCode')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
              />
              <FieldGroup.SectionFooter>
                <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                  {tr('integrations.enterTwofactorCodeForEndurain')}
                </Text>
              </FieldGroup.SectionFooter>
              <Button
                label={tr('integrations.restartSignin')}
                variant="text"
                disabled={busy}
                onPress={() => {
                  setMfaToken(null);
                  clearSecrets();
                }}
              />
            </FieldGroup.Section>
          ) : (
            <>
              <FieldGroup.Section title={tr('integrations.serviceConnection')}>
                {isEndurain && existing ? (
                  infoRow(rt, { label: tr('common.server'), value: existing.server_url })
                ) : (
                  <TextInput
                    defaultValue={server}
                    onChangeText={setServer}
                    placeholder={tr('integrations.serverAddressHttps')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                )}
                {isEndurain ? (
                  existing ? (
                    infoRow(rt, { label: tr('common.username'), value: existing.username ?? '–' })
                  ) : (
                    <>
                      <TextInput
                        defaultValue={username}
                        onChangeText={setUsername}
                        placeholder={tr('common.username')}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TextInput
                        key={`password-${secretRevision}`}
                        defaultValue=""
                        onChangeText={setPassword}
                        placeholder={tr('common.password')}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </>
                  )
                ) : (
                  <TextInput
                    key={`key-${secretRevision}`}
                    defaultValue=""
                    onChangeText={setApiKey}
                    placeholder={existing ? tr('integrations.newApiKeyLeaveBlank') : tr('common.apiKeys')}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
                {kind === 'immich'
                  ? switchRow(rt, {
                      label: tr('integrations.copyImagesServer'),
                      value: copyLocally,
                      onChange: setCopyLocally,
                    })
                  : null}
                <FieldGroup.SectionFooter>
                  <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                    {tr('integrations.adventurelogServerChecksConnectionStores')}
                  </Text>
                </FieldGroup.SectionFooter>
              </FieldGroup.Section>
              {kind === 'immich' ? (
                <FieldGroup.Section>
                  <FieldGroup.SectionFooter>
                    <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                      {tr('integrations.onTestedServerImmichImages')}
                    </Text>
                  </FieldGroup.SectionFooter>
                </FieldGroup.Section>
              ) : null}
              {existing ? (
                <FieldGroup.Section>
                  <ListItem
                    colors={{ ...rt.listColors, contentColor: rt.colors.danger }}
                    onPress={action.online && !busy ? disconnect : undefined}>
                    {tr('integrations.disconnectIntegration')}
                  </ListItem>
                  {isEndurain ? (
                    <FieldGroup.SectionFooter>
                      <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                        {tr('integrations.useAnotherEndurainAccountDisconnect')}
                      </Text>
                    </FieldGroup.SectionFooter>
                  ) : null}
                </FieldGroup.Section>
              ) : null}
            </>
          )}
        </FieldGroup>
      </FormHost>
    </>
  );
}

function StravaSettings() {
  const client = useClient();
  const query = useIntegrations();
  const action = useOnlineAction();
  const rt = useRowTheme();
  const [busy, setBusy] = useState(false);
  const connected = query.data?.strava?.user;
  const configured = query.data?.strava?.global;
  const disconnect = () =>
    Alert.alert(tr('integrations.disconnectIntegrationConfirm'), tr('integrations.connectionRemovedForAccountOn'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('integrations.disconnect'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          await action.run(async () => {
            await client.edit.disconnectIntegration('strava');
            return true;
          }, [queryKeys.integrations]);
          setBusy(false);
        },
      },
    ]);
  return (
    <>
      <Stack.Screen options={{ title: 'Strava' }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {infoRow(rt, {
              label: tr('integrations.serviceConnection'),
              value: !query.data
                ? tr('integrations.statusUnknown')
                : connected
                  ? tr('integrations.connected')
                  : tr('integrations.notConnected'),
            })}
            {connected ? (
              <ListItem
                colors={{ ...rt.listColors, contentColor: rt.colors.danger }}
                onPress={action.online && !busy ? disconnect : undefined}>
                {tr('integrations.disconnectIntegration')}
              </ListItem>
            ) : (
              <ListItem
                colors={rt.listColors}
                onPress={action.online && configured ? () => router.push('/integrations/strava-connect') : undefined}>
                {tr('integrations.connectStrava')}
              </ListItem>
            )}
            {!configured && query.data ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                  {tr('integrations.stravaMustFirstConfiguredWith')}
                </Text>
              </FieldGroup.SectionFooter>
            ) : null}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                {tr('integrations.authorizationTakesPlaceAtStrava')}
              </Text>
            </FieldGroup.SectionFooter>
            {query.isError ? (
              <ListItem colors={rt.listColors} onPress={() => void query.refetch()}>
                {tr('common.tryAgain')}
              </ListItem>
            ) : null}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}
