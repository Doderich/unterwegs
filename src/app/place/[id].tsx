import { useDescriptionRows } from '@/ui/useDescriptionRows';
import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { useClient } from '@/auth/session';
import { useCollections } from '@/data/queries';
import { useLocation, useLocationAction, useLocationFiles } from '@/data/useLocation';
import { tr } from '@/i18n';
import { deviceTimeZone, formatDayLabel, visitTime } from '@/time/tz';
import { useActionSheet } from '@/ui/ActionSheet';
import { choosePhotos, takePhoto } from '@/ui/media';
import { Host } from '@/ui/Host';
import { LoadingRows } from '@/ui/LoadingRows';
import { resourceHeaderRows } from '@/ui/ResourceHeader';
import { filesSection } from '@/ui/resourceDetail';
import { linkRow, mapsRow, RowIcon, useOpenAttachment, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Text } from '@/ui/Text';
import { toolbarIcon } from '@/ui/icons';

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useLocation(id);
  const files = useLocationFiles(query.data);
  const collections = useCollections();
  const client = useClient();
  const action = useLocationAction(id);
  const rt = useRowTheme();
  const sheet = useActionSheet(rt);
  const opener = useOpenAttachment();
  const place = query.data;
  const descriptionRows = useDescriptionRows(rt, place?.description);
  if (!place)
    return (
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {query.isPending && query.isFetching ? (
              <LoadingRows />
            ) : (
              <Text>{query.fetchStatus === 'paused' ? tr('common.offlineNoData') : tr('places.loadFailed')}</Text>
            )}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    );
  const addPhoto = () =>
    sheet.open(tr('media.addPhoto'), [
      {
        label: tr('media.takePhoto'),
        icon: 'camera',
        onPress: () =>
          void takePhoto().then((file) => file && action.run(() => client.edit.uploadImage('location', id, file))),
      },
      {
        label: tr('media.fromLibrary'),
        icon: 'library',
        onPress: () =>
          void choosePhotos().then((picked) =>
            Promise.all(picked.map((file) => action.run(() => client.edit.uploadImage('location', id, file)))),
          ),
      },
      {
        label: tr('media.fromWikipediaOrWeb'),
        icon: 'world',
        onPress: () =>
          router.push({
            pathname: '/web-image/[collectionId]',
            params: { collectionId: 'library', kind: 'location', objectId: id, name: place.name, library: '1' },
          }),
      },
    ]);
  const addToCollection = () =>
    sheet.open(
      tr('places.addToCollection'),
      (collections.data ?? [])
        .filter((c) => !place.collections?.includes(c.id))
        .map((c) => ({
          label: c.name,
          icon: 'luggage',
          onPress: () =>
            action.run(async () => {
              const current = await client.getLocation(id);
              return client.edit.updateLocation(id, {
                collections: [...new Set([...(current.collections ?? []), c.id])],
              });
            }),
        })),
    );
  return (
    <>
      <Stack.Screen options={{ title: place.name }} />
      {action.online ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={toolbarIcon('edit') as never}
            accessibilityLabel={tr('common.edit')}
            onPress={() => router.push({ pathname: '/place-edit', params: { id } })}
          />
          <Stack.Toolbar.Button
            icon={toolbarIcon('addPhoto') as never}
            accessibilityLabel={tr('media.addPhoto')}
            onPress={addPhoto}
          />
        </Stack.Toolbar>
      ) : null}
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {resourceHeaderRows(rt, {
              images: place.images,
              title: place.name,
              subtitle: place.category?.display_name,
              icon: 'location',
            })}
          </FieldGroup.Section>
          <FieldGroup.Section>
            {mapsRow(rt, {
              label: place.name,
              address: place.location,
              latitude: place.latitude,
              longitude: place.longitude,
            })}
            {place.link ? linkRow(rt, { label: tr('places.website'), url: place.link }) : null}
          </FieldGroup.Section>
          {place.description ? (
            <FieldGroup.Section title={tr('common.description')}>{descriptionRows}</FieldGroup.Section>
          ) : null}
          <FieldGroup.Section title={tr('places.visits')}>
            {place.visits
              .filter((v) => v.start_date)
              .map((v) => {
                const time = visitTime(v.start_date!, v.end_date, v.timezone || deviceTimeZone());
                return (
                  <ListItem
                    key={v.id}
                    colors={rt.listColors}
                    leading={<RowIcon name="days" />}
                    supportingText={
                      <Sub>
                        {[time.time, v.timezone, v.notes === 'Created from itinerary planning' ? null : v.notes]
                          .filter(Boolean)
                          .join(' · ')}
                      </Sub>
                    }
                    onPress={
                      action.online
                        ? () => router.push({ pathname: '/place-visit/[id]', params: { id, visitId: v.id } })
                        : undefined
                    }>
                    {formatDayLabel(time.date)}
                  </ListItem>
                );
              })}
            {action.online ? (
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="add" />}
                onPress={() => router.push({ pathname: '/place-visit/[id]', params: { id } })}>
                {tr('common.addVisit')}
              </ListItem>
            ) : null}
            {!place.visits.length ? (
              <Text textStyle={{ color: rt.colors.secondary }}>{tr('places.noVisits')}</Text>
            ) : null}
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('common.trips')}>
            {(collections.data ?? [])
              .filter((c) => place.collections?.includes(c.id))
              .map((c) => (
                <ListItem
                  key={c.id}
                  colors={rt.listColors}
                  leading={<RowIcon name="luggage" />}
                  onPress={() => router.push({ pathname: '/collection/[id]', params: { id: c.id, name: c.name } })}>
                  {c.name}
                </ListItem>
              ))}
            {action.online ? (
              <ListItem colors={rt.listColors} leading={<RowIcon name="addToPlan" />} onPress={addToCollection}>
                {tr('places.addToCollection')}
              </ListItem>
            ) : null}
          </FieldGroup.Section>
          {filesSection(rt, opener, tr('common.attachments'), place.attachments)}
          {files.total ? (
            <FieldGroup.Section>
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="offline" />}
                supportingText={<Sub>{tr('utilities.savedCount', { cached: files.cached, total: files.total })}</Sub>}
                onPress={action.online && !files.running ? () => void files.sync() : undefined}>
                {files.running ? tr('common.loading') : tr('places.saveOffline')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
          {action.online ? (
            <FieldGroup.Section>
              <ListItem
                colors={{ ...rt.listColors, contentColor: rt.colors.danger }}
                leading={<RowIcon name="delete" color={rt.colors.danger} />}
                onPress={() =>
                  Alert.alert(tr('common.deleteNameConfirm', { name: place.name }), tr('common.cantUndone'), [
                    { text: tr('common.cancel'), style: 'cancel' },
                    {
                      text: tr('common.delete'),
                      style: 'destructive',
                      onPress: async () => {
                        const ok = await action.run(() => client.edit.deleteLocation(id).then(() => true));
                        if (ok) router.back();
                      },
                    },
                  ])
                }>
                {tr('common.delete')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
      {sheet.sheet}
    </>
  );
}
