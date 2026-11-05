import { FieldGroup, Icon, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { useRegions, useRegionVisits } from '@/data/queries';
import { useRegionEdits } from '@/data/useRegionEdits';
import { flagEmoji, percent, regionRows } from '@/data/world';
import { tr } from '@/i18n';
import { androidToolbarIcon, icons } from '@/ui/icons';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';

/**
 * Regions of one country. A region with cities opens its cities; one without is marked visited or not by a tap
 * (online only, like on the website).
 */
export default function CountryScreen() {
  const { code, name } = useLocalSearchParams<{ code: string; name?: string }>();
  const rt = useRowTheme();
  const regions = useRegions(code);
  const visits = useRegionVisits(code);
  const edits = useRegionEdits(code);
  const rows = useMemo(() => regionRows(regions.data ?? [], visits.data ?? []), [regions.data, visits.data]);
  const visitedCount = rows.filter((r) => r.visited).length;

  const hasMap = rows.some((r) => r.latitude != null && r.longitude != null);
  const title = `${flagEmoji(code)} ${name ?? code}`;

  const refresh = async () => void (await Promise.all([regions.refetch(), visits.refetch()]));

  return (
    <>
      <Stack.Screen options={{ title }} />
      {hasMap ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('map')}
            accessibilityLabel={tr('common.map')}
            onPress={() => router.push({ pathname: '/world/map', params: { country: code, title } })}>
            {tr('common.map')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup onRefresh={refresh}>
          <FieldGroup.Section
            title={
              rows.length > 0
                ? tr('world.nOfTotalRegionsVisited', {
                    n: visitedCount,
                    total: rows.length,
                    p: percent(visitedCount, rows.length),
                  })
                : undefined
            }>
            {rows.length === 0 ? (
              <ListItem colors={rt.listColors}>
                {regions.isPending
                  ? tr('common.loading')
                  : regions.isError
                    ? tr('common.couldNotLoadedPullRefresh')
                    : tr('world.noRegions')}
              </ListItem>
            ) : null}
            {rows.map((r) => (
              <ListItem
                key={r.id}
                colors={rt.listColors}
                leading={
                  <Icon
                    name={icons[r.visited ? 'checked' : 'unchecked']}
                    size={22}
                    color={r.visited ? rt.colors.tint : rt.colors.secondary}
                  />
                }
                supportingText={<Sub>{r.num_cities > 0 ? tr('common.cities', { count: r.num_cities }) : null}</Sub>}
                trailing={
                  r.num_cities > 0 ? <Icon name={icons.chevron} size={18} color={rt.colors.secondary} /> : undefined
                }
                onPress={() =>
                  r.num_cities > 0
                    ? router.push({ pathname: '/world/region/[id]', params: { id: r.id, name: r.name, country: code } })
                    : void (r.visited ? edits.unmarkVisited(r) : edits.markVisited(r))
                }>
                {r.name}
              </ListItem>
            ))}
          </FieldGroup.Section>
          {!edits.online && rows.length > 0 ? (
            <FieldGroup.Section>
              <ListItem
                colors={rt.listColors}
                leading={<Icon name={icons.offline} size={22} color={rt.colors.secondary} />}>
                {tr('common.editingNeedsInternetConnection')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </RefreshableFieldGroup>
      </Host>
    </>
  );
}
