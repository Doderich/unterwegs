import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { Alert } from 'react-native';

import { useArchivedCollections, useCollections, useInvites } from '@/data/queries';
import { useCollectionsActions } from '@/data/useCollectionsActions';
import { sortCollections } from '@/data/selectors';
import { tr } from '@/i18n';
import { todayIn } from '@/time/today';
import { deviceTimeZone } from '@/time/tz';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { Sub } from '@/ui/Sub';
import { leadingFor } from '@/ui/entries';
import { formatDateRange } from '@/ui/format';
import { RowIcon } from '@/ui/rows';
import { useColors, useListColors, type Colors } from '@/ui/theme';
import { Host } from '@/ui/Host';
import { LoadingRows } from '@/ui/LoadingRows';
import { GlobalSearchRow } from '@/ui/GlobalSearchRow';
import { MainSearchScreen } from '@/ui/MainSearchScreen';

type SortedCollection = ReturnType<typeof sortCollections>[number];
type ListColors = ReturnType<typeof useListColors>;

export default function CollectionsScreen() {
  const collections = useCollections();
  const actions = useCollectionsActions();
  const invites = useInvites();
  const archived = useArchivedCollections();
  const colors = useColors();
  const listColors = useListColors();
  const today = todayIn(deviceTimeZone());
  const sorted = useMemo(() => sortCollections(collections.data ?? [], today), [collections.data, today]);

  const upcoming = sorted.filter((t) => t.phase === 'current' || t.phase === 'upcoming');
  const past = sorted.filter((t) => t.phase === 'past');
  const undated = sorted.filter((t) => !t.phase);
  const archivedSorted = useMemo(() => sortCollections(archived.data ?? [], today), [archived.data, today]);

  const refresh = async () => void (await Promise.all([collections.refetch(), invites.refetch(), archived.refetch()]));

  const emptyText =
    collections.fetchStatus === 'paused' && !collections.data
      ? tr('common.offlineNoData')
      : collections.isError
        ? tr('home.couldntLoadTripsPullRefresh')
        : tr('home.noTripsYetCreateOne');

  const answerInvite = (collectionId: string, name: string) =>
    Alert.alert(tr('home.invitationName', { name }), tr('home.acceptSeeTripInApp'), [
      { text: tr('home.later'), style: 'cancel' },
      { text: tr('home.decline'), style: 'destructive', onPress: () => void actions.declineInvite(collectionId) },
      {
        text: tr('home.accept'),
        onPress: async () => {
          const ok = await actions.acceptInvite(collectionId);
          if (ok) router.push({ pathname: '/collection/[id]', params: { id: collectionId, name } });
        },
      },
    ]);

  return (
    <MainSearchScreen tab="collections">
      <>
        <Host style={{ flex: 1 }}>
          <RefreshableFieldGroup onRefresh={refresh}>
            <GlobalSearchRow />
            {invites.data && invites.data.length > 0 ? (
              <FieldGroup.Section title={tr('home.invitations')}>
                {invites.data.map((inv) => {
                  const name = inv.name ?? tr('common.trip');
                  const from =
                    [inv.collection_user_first_name, inv.collection_user_last_name].filter(Boolean).join(' ') ||
                    inv.collection_owner_username;
                  return (
                    <ListItem
                      key={inv.id}
                      colors={listColors}
                      leading={<RowIcon name="personAdd" />}
                      supportingText={
                        <Sub>{from ? tr('home.fromNameTapAccept', { name: from }) : tr('home.tapAccept')}</Sub>
                      }
                      onPress={actions.online ? () => answerInvite(inv.collection, name) : undefined}>
                      {name}
                    </ListItem>
                  );
                })}
              </FieldGroup.Section>
            ) : null}

            {sorted.length === 0 ? (
              <FieldGroup.Section>
                {collections.isPending && collections.isFetching ? (
                  <LoadingRows />
                ) : (
                  <ListItem colors={listColors} supportingText={<Sub>{emptyText}</Sub>}>
                    {tr('home.noTrips')}
                  </ListItem>
                )}
              </FieldGroup.Section>
            ) : null}

            {upcoming.length > 0 ? (
              <FieldGroup.Section>{upcoming.map((t) => collectionRow(t, colors, listColors))}</FieldGroup.Section>
            ) : null}
            {past.length > 0 ? (
              <FieldGroup.Section title={tr('home.pastTrips')}>
                {past.map((t) => collectionRow(t, colors, listColors))}
              </FieldGroup.Section>
            ) : null}
            {undated.length > 0 ? (
              <FieldGroup.Section title={tr('home.noDate')}>
                {undated.map((t) => collectionRow(t, colors, listColors))}
              </FieldGroup.Section>
            ) : null}
            {archivedSorted.length > 0 ? (
              <FieldGroup.Section title={tr('home.archive')}>
                {archivedSorted.map((t) => collectionRow(t, colors, listColors))}
              </FieldGroup.Section>
            ) : null}
          </RefreshableFieldGroup>
        </Host>
      </>
    </MainSearchScreen>
  );
}

function collectionRow(collection: SortedCollection, colors: Colors, listColors: ListColors): ReactElement {
  return (
    <ListItem
      key={collection.id}
      colors={listColors}
      leading={leadingFor(
        collection.primary_image ? [collection.primary_image] : collection.location_images,
        <RowIcon
          name={collection.phase === 'current' ? 'luggage' : 'days'}
          color={collection.phase === 'past' ? colors.secondary : colors.tint}
        />,
      )}
      supportingText={<Sub>{formatDateRange(collection.start_date, collection.end_date)}</Sub>}
      onPress={() =>
        router.push({ pathname: '/collection/[id]', params: { id: collection.id, name: collection.name } })
      }>
      {collection.name}
    </ListItem>
  );
}
