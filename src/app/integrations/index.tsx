import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack } from 'expo-router';

import { useIntegrations } from '@/data/queries';
import { useOnline } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

export default function IntegrationsScreen() {
  const query = useIntegrations();
  const online = useOnline();
  const rt = useRowTheme();
  const data = query.data;
  const entries = [
    { kind: 'immich', name: 'Immich', connected: data?.immich?.exists },
    { kind: 'wanderer', name: 'Wanderer', connected: data?.wanderer?.exists },
    { kind: 'endurain', name: 'Endurain', connected: data?.endurain?.exists },
    { kind: 'strava', name: 'Strava', connected: data?.strava?.user },
  ];
  return (
    <>
      <Stack.Screen options={{ title: tr('common.integrations') }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title={tr('integrations.connectedServices')}>
            {query.isError ? (
              <ListItem colors={rt.listColors} onPress={() => void query.refetch()}>
                {tr('integrations.couldNotLoadIntegrationsTap')}
              </ListItem>
            ) : null}
            {entries.map((entry) => (
              <ListItem
                key={entry.kind}
                colors={rt.listColors}
                leading={<RowIcon name="link" />}
                supportingText={
                  <Sub>
                    {!data
                      ? tr('integrations.statusUnknown')
                      : entry.connected
                        ? tr('integrations.connected')
                        : tr('integrations.notConnected')}
                  </Sub>
                }
                onPress={() => router.push({ pathname: '/integrations/[kind]', params: { kind: entry.kind } })}>
                {entry.name}
              </ListItem>
            ))}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                {online ? tr('integrations.connectionsApplyAdventurelogAccountOn') : tr('common.onlyWithInternet')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section title="Google Maps">
            <ListItem
              colors={rt.listColors}
              supportingText={
                <Sub>
                  {!data
                    ? tr('integrations.statusUnknown')
                    : data.google_maps
                      ? tr('integrations.configuredOnServer')
                      : tr('integrations.notConfiguredOnServer')}
                </Sub>
              }>
              {tr('integrations.placeSearchRecommendations')}
            </ListItem>
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                {tr('integrations.googleMapsKeySetIn')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}
