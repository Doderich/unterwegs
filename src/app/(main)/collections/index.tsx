import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { Alert, useWindowDimensions } from 'react-native';

import { useArchivedCollections, useCollections, useInvites } from '@/data/queries';
import { useCollectionsActions } from '@/data/useCollectionsActions';
import { sortCollections } from '@/data/selectors';
import { tr } from '@/i18n';
import { todayIn } from '@/time/today';
import { deviceTimeZone } from '@/time/tz';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { Sub } from '@/ui/Sub';
import { leadingFor } from '@/ui/entries';
import { collectionCountdown, formatDateRange } from '@/ui/format';
import { RowIcon } from '@/ui/rows';
import { useColors, useListColors, type Colors } from '@/ui/theme';
import { Host } from '@/ui/Host';
import { LoadingRows } from '@/ui/LoadingRows';
import { GlobalSearchRow } from '@/ui/GlobalSearchRow';
import { MainSearchScreen } from '@/ui/MainSearchScreen';
import { MemoryStrip } from '@/ui/Memories';
import { CardRow, cardRowWidth } from '@/ui/CardRow';

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
  const { width: windowWidth } = useWindowDimensions();
  const sorted = useMemo(() => sortCollections(collections.data ?? [], today), [collections.data, today]);

  const upcoming = sorted.filter((t) => t.phase === 'current' || t.phase === 'upcoming');
  const past = sorted.filter((t) => t.phase === 'past');
  const undated = sorted.filter((t) => !t.phase);
  const archivedSorted = useMemo(() => sortCollections(archived.data ?? [], today), [archived.data, today]);

  const refresh = async () => void (await Promise.all([collections.refetch(), invites.refetch(), archived.refetch()]));

  const emptyProblem =
    collections.fetchStatus === 'paused' && !collections.data
      ? tr('common.offlineNoData')
      : collections.isError
        ? tr('home.couldntLoadTripsPullRefresh')
        : null;

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
                ) : emptyProblem ? (
                  <ListItem colors={listColors} supportingText={<Sub>{emptyProblem}</Sub>}>
                    {tr('home.noTrips')}
                  </ListItem>
                ) : (
                  // A real empty library: the first collection is one tap away, not behind the header's +.
                  <ListItem
                    colors={listColors}
                    leading={<RowIcon name="add" />}
                    supportingText={<Sub>{tr('home.noTripsYetHint')}</Sub>}
                    onPress={() => router.push('/collection-edit')}>
                    {tr('common.newTrip')}
                  </ListItem>
                )}
              </FieldGroup.Section>
            ) : null}

            {upcoming.length > 0 ? (
              <FieldGroup.Section>
                {upcoming.map((t) => collectionRow(t, colors, listColors, today))}
              </FieldGroup.Section>
            ) : null}
            {/* Finished collections are memories: their cover photos, not another list of dates. */}
            {past.length > 0 ? (
              <CardRow title={tr('home.pastTrips')}>
                <MemoryStrip collections={past} today={today} width={cardRowWidth(windowWidth)} />
              </CardRow>
            ) : null}
            {undated.length > 0 ? (
              <FieldGroup.Section title={tr('home.noDate')}>
                {undated.map((t) => collectionRow(t, colors, listColors, today))}
              </FieldGroup.Section>
            ) : null}
            {archivedSorted.length > 0 ? (
              <FieldGroup.Section title={tr('home.archive')}>
                {archivedSorted.map((t) => collectionRow(t, colors, listColors, today))}
              </FieldGroup.Section>
            ) : null}
          </RefreshableFieldGroup>
        </Host>
      </>
    </MainSearchScreen>
  );
}

function collectionRow(
  collection: SortedCollection,
  colors: Colors,
  listColors: ListColors,
  today: string,
): ReactElement {
  const dates = formatDateRange(collection.start_date, collection.end_date);
  const countdown =
    (collection.phase === 'upcoming' || collection.phase === 'current') && collection.start_date && collection.end_date
      ? collectionCountdown(collection.start_date, collection.end_date, today)
      : null;
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
      supportingText={
        // Upcoming and running collections lead with time, in apricot: "Noch 5 Mal schlafen! · 17.12. – 08.01.".
        countdown ? <Sub color={colors.next}>{`${countdown} · ${dates}`}</Sub> : <Sub>{dates}</Sub>
      }
      onPress={() =>
        router.push({ pathname: '/collection/[id]', params: { id: collection.id, name: collection.name } })
      }>
      {collection.name}
    </ListItem>
  );
}
