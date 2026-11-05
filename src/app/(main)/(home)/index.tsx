import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import { useWindowDimensions } from 'react-native';

import { requestErrorText } from '@/api/errors';
import { homeFeed, type FeedItem } from '@/data/homeFeed';
import { queryKeys, useCollections, useInvites } from '@/data/queries';
import { useClient } from '@/auth/session';
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
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';
import { Text } from '@/ui/Text';
import { LoadingRows } from '@/ui/LoadingRows';
import { GlobalSearchRow } from '@/ui/GlobalSearchRow';
import { MainSearchScreen } from '@/ui/MainSearchScreen';

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
        leading={<RowIcon name="luggage" />}
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
                {!feed.recent.length &&
                ((collections.isPending && collections.fetchStatus === 'paused') ||
                  (locations.isPending && locations.fetchStatus === 'paused'))
                  ? tr('common.offlineNoData')
                  : tr('feed.nothingPlanned')}
              </Text>
            </FieldGroup.Section>
          ) : null}
          {collections.isError || locations.isError ? (
            <FieldGroup.Section>
              <Text textStyle={{ color: rt.colors.secondary }}>
                {`${tr('feed.refreshFailed')}\n${requestErrorText(collections.error ?? locations.error)}`}
              </Text>
            </FieldGroup.Section>
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
