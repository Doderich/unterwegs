import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { useProfile, useProfileStats } from '@/data/queries';
import { tr } from '@/i18n';
import { formatDateRange, formatPlainDate, personName } from '@/ui/format';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { openInMaps, RowIcon, useRowTheme } from '@/ui/rows';
import { statRows } from '@/ui/statRows';
import { Sub } from '@/ui/Sub';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { typeScale } from '@/ui/typeScale';
import { Host } from '@/ui/Host';

/** A public profile: statistics, public collections (open read-only) and public locations. */
export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const rt = useRowTheme();
  const colors = useColors();
  const profile = useProfile(username);
  const stats = useProfileStats(username);
  const user = profile.data?.user;
  const name = user ? personName(user) : `@${username}`;

  const refresh = async () => void (await Promise.all([profile.refetch(), stats.refetch()]));

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup onRefresh={refresh}>
          <FieldGroup.Section>
            <Text textStyle={{ ...typeScale.title, color: colors.text }}>{name}</Text>
            <Text textStyle={{ color: colors.secondary }}>
              {[
                `@${username}`,
                user?.date_joined
                  ? tr('people.memberSinceDate', { date: formatPlainDate(user.date_joined.slice(0, 10)) })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </FieldGroup.Section>

          {profile.isError ? (
            <FieldGroup.Section>
              <ListItem colors={rt.listColors}>{tr('people.profileNotPublicOrNot')}</ListItem>
            </FieldGroup.Section>
          ) : null}

          {stats.data ? (
            <FieldGroup.Section title={tr('common.statistics')}>{statRows(rt, stats.data)}</FieldGroup.Section>
          ) : null}

          {profile.data?.collections.length ? (
            <FieldGroup.Section title={tr('people.publicTrips')}>
              {profile.data.collections.map((c) => (
                <ListItem
                  key={c.id}
                  colors={rt.listColors}
                  leading={<RowIcon name="luggage" />}
                  supportingText={<Sub>{formatDateRange(c.start_date?.slice(0, 10), c.end_date?.slice(0, 10))}</Sub>}
                  onPress={() => router.push({ pathname: '/collection/[id]', params: { id: c.id, name: c.name } })}>
                  {c.name}
                </ListItem>
              ))}
            </FieldGroup.Section>
          ) : null}

          {profile.data?.adventures.length ? (
            <FieldGroup.Section title={tr('people.publicPlaces')}>
              {profile.data.adventures.map((l) => (
                <ListItem
                  key={l.id}
                  colors={rt.listColors}
                  leading={<RowIcon name="location" />}
                  supportingText={
                    <Sub>
                      {[
                        l.category
                          ? `${l.category.icon ?? ''} ${l.category.display_name ?? l.category.name}`.trim()
                          : null,
                        l.is_visited ? tr('common.visited') : null,
                        l.location,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Sub>
                  }
                  onPress={l.latitude != null ? () => openInMaps(l.name, l.latitude, l.longitude) : undefined}>
                  {l.name}
                </ListItem>
              ))}
            </FieldGroup.Section>
          ) : null}
        </RefreshableFieldGroup>
      </Host>
    </>
  );
}
