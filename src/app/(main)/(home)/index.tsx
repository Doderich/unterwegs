import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { useWindowDimensions } from 'react-native';

import { requestErrorText } from '@/api/errors';
import { homeFeed, type FeedItem } from '@/data/homeFeed';
import { queryKeys, useCollections, useInvites } from '@/data/queries';
import { useClient } from '@/auth/session';
import { useOnline } from '@/data/useOnlineAction';
import { useLocations } from '@/data/useLocation';
import { tr } from '@/i18n';
import { deviceTimeZone, formatDayLabel, visitTime } from '@/time/tz';
import { collectionTimeZone, todayIn } from '@/time/today';
import { CardRow, cardRowWidth } from '@/ui/CardRow';
import { CompatNotice } from '@/ui/CompatNotice';
import { CollectionHero } from '@/ui/CollectionHero';
import { leadingFor } from '@/ui/entries';
import { formatDateRange } from '@/ui/format';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { offlineNoticeRow, RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';
import { Text } from '@/ui/Text';
import { LoadingRows } from '@/ui/LoadingRows';
import { GlobalSearchRow } from '@/ui/GlobalSearchRow';
import { MainSearchScreen } from '@/ui/MainSearchScreen';
import { MemoryCard, onThisDay, onThisDayCaption } from '@/ui/Memories';

export default function HomeScreen() {
  const collections = useCollections();
  const locations = useLocations();
  const invites = useInvites();
  const rt = useRowTheme();
  const { width } = useWindowDimensions();
  const client = useClient();
  const cached = useQueries({
    queries: (collections.data ?? []).map((c) => ({
      queryKey: queryKeys.collection(c.id),
      queryFn: () => client.getCollection(c.id),
      enabled: false,
    })),
  });
  const zones = new Map(cached.flatMap((q) => (q.data ? [[q.data.id, collectionTimeZone(q.data)] as const] : [])));
  const feed = homeFeed(collections.data ?? [], locations.data ?? [], new Date(), zones);
  const featured = feed.current[0] ?? feed.upcoming[0];
  const current = feed.current.filter((i) => i.kind !== 'collection' || i.key !== featured?.key);
  const upcoming = feed.upcoming.filter((i) => i.kind !== 'collection' || i.key !== featured?.key);
  const row = (item: FeedItem) =>
    item.kind === 'collection' ? (
      <ListItem
        key={item.key}
        colors={rt.listColors}
        leading={leadingFor(
          item.collection.primary_image ? [item.collection.primary_image] : item.collection.location_images,
          <RowIcon name="luggage" />,
        )}
        supportingText={<Sub>{formatDateRange(item.collection.start_date, item.collection.end_date)}</Sub>}
        onPress={() =>
          router.push({ pathname: '/collection/[id]', params: { id: item.collection.id, name: item.collection.name } })
        }>
        {item.collection.name}
      </ListItem>
    ) : (
      <ListItem
        key={item.key}
        colors={rt.listColors}
        leading={leadingFor(item.location.images, <RowIcon name="location" />)}
        supportingText={
          <Sub>
            {[
              formatDayLabel(item.date),
              visitTime(item.visit.start_date!, item.visit.end_date, item.visit.timezone || deviceTimeZone()).time,
              item.location.location,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Sub>
        }
        onPress={() => router.push({ pathname: '/place/[id]', params: { id: item.location.id } })}>
        {item.location.name}
      </ListItem>
    );
  const empty = !feed.current.length && !feed.upcoming.length;
  const today = todayIn(deviceTimeZone());
  const memory = onThisDay(collections.data ?? [], today);
  const online = useOnline();
  const offlineNoData =
    !feed.recent.length &&
    ((collections.isPending && collections.fetchStatus === 'paused') ||
      (locations.isPending && locations.fetchStatus === 'paused'));
  const loading =
    empty &&
    !feed.recent.length &&
    ((collections.isPending && collections.isFetching) || (locations.isPending && locations.isFetching));
  const refresh = async () => {
    await Promise.all([collections.refetch(), locations.refetch(), invites.refetch()]);
  };
  return (
    <MainSearchScreen tab="index">
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup onRefresh={refresh}>
          <GlobalSearchRow />
          {/* Offline is the normal case on the road: say up front that the saved trip is all here. */}
          {!online && !offlineNoData && !loading ? (
            <FieldGroup.Section>{offlineNoticeRow(rt, collections.dataUpdatedAt)}</FieldGroup.Section>
          ) : null}
          <CompatNotice />
          {featured?.kind === 'collection' ? (
            <CardRow>
              <CollectionHero
                collection={featured.collection}
                current={featured.current}
                today={todayIn(deviceTimeZone())}
                width={cardRowWidth(width)}
                compact
              />
            </CardRow>
          ) : null}
          {invites.data?.length ? (
            <FieldGroup.Section title={tr('home.invitations')}>
              {invites.data.map((invite) => (
                <ListItem
                  key={invite.id}
                  colors={rt.listColors}
                  leading={<RowIcon name="personAdd" />}
                  supportingText={<Sub>{tr('feed.invitationHint')}</Sub>}
                  onPress={() => router.push('/collections')}>
                  {invite.name ?? tr('common.trip')}
                </ListItem>
              ))}
            </FieldGroup.Section>
          ) : null}
          {current.length ? <FieldGroup.Section title={tr('feed.today')}>{current.map(row)}</FieldGroup.Section> : null}
          {upcoming.length ? (
            <FieldGroup.Section title={tr('feed.upcoming')}>{upcoming.slice(0, 12).map(row)}</FieldGroup.Section>
          ) : null}
          {loading ? (
            <FieldGroup.Section>
              <LoadingRows />
            </FieldGroup.Section>
          ) : empty && !collections.isError && !locations.isError ? (
            <FieldGroup.Section>
              <Text textStyle={{ color: rt.colors.secondary }}>
                {offlineNoData ? tr('common.offlineNoData') : tr('feed.nothingPlanned')}
              </Text>
              {/* An empty feed offers the next step in reach of the thumb, not only in the header's + menu. */}
              {online && !offlineNoData ? (
                <ListItem
                  colors={rt.listColors}
                  leading={<RowIcon name="luggage" />}
                  onPress={() => router.push('/collection-edit')}>
                  {tr('common.newTrip')}
                </ListItem>
              ) : null}
              {online && !offlineNoData ? (
                <ListItem
                  colors={rt.listColors}
                  leading={<RowIcon name="location" />}
                  onPress={() => router.push('/place-edit')}>
                  {tr('common.newPlace')}
                </ListItem>
              ) : null}
            </FieldGroup.Section>
          ) : null}
          {collections.isError || locations.isError ? (
            <FieldGroup.Section>
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="refresh" />}
                supportingText={
                  <Sub>{`${tr('feed.refreshFailed')}\n${requestErrorText(collections.error ?? locations.error)}`}</Sub>
                }
                onPress={() => void refresh()}>
                {tr('common.tryAgain')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
          {memory ? (
            <CardRow title={tr('memories.title')}>
              <MemoryCard
                collection={memory}
                today={today}
                caption={onThisDayCaption(memory, today)}
                width={cardRowWidth(width)}
                height={200}
              />
            </CardRow>
          ) : null}
          {feed.recent.length ? (
            <FieldGroup.Section title={tr('feed.recent')}>
              {feed.recent.map((place) => (
                <ListItem
                  key={place.id}
                  colors={rt.listColors}
                  leading={leadingFor(place.images, <RowIcon name="location" />)}
                  supportingText={<Sub>{place.location}</Sub>}
                  onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}>
                  {place.name}
                </ListItem>
              ))}
            </FieldGroup.Section>
          ) : null}
        </RefreshableFieldGroup>
      </Host>
    </MainSearchScreen>
  );
}
