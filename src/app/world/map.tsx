import { Icon } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { useCities, useCityVisits, usePins, useRegions, useRegionVisits } from '@/data/queries';
import { useCityEdits, useRegionEdits } from '@/data/useRegionEdits';
import { cityRows, placedPins, regionRows } from '@/data/world';
import { tr } from '@/i18n';
import { icons } from '@/ui/icons';
import { PointsMap, type MapPoint } from '@/ui/PointsMap';
import { openInMaps, RowIcon } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { SheetRow } from '@/ui/SheetRow';
import { useListColors, useColors } from '@/ui/theme';

const placed = <T extends { latitude?: number | null; longitude?: number | null }>(rows: T[]) =>
  rows.filter((r): r is T & { latitude: number; longitude: number } => r.latitude != null && r.longitude != null);

/**
 * A map of points with their visit status: every location of the user (`/api/locations/pins`) by default, the
 * regions of a country with `country`, or the cities of a region with `region` (+ its `country`).
 */
export default function WorldMapScreen() {
  const { country, region, title } = useLocalSearchParams<{ country?: string; region?: string; title?: string }>();
  if (region) return <CitiesMap regionId={region} title={title} />;
  if (country) return <RegionsMap code={country} title={title} />;
  return <AllLocationsMap />;
}

function AllLocationsMap() {
  const pins = usePins();
  const listColors = useListColors();
  const all = useMemo(() => placedPins(pins.data ?? []), [pins.data]);
  const points = useMemo<MapPoint[]>(() => all.map((p) => ({ ...p, visited: !!p.is_visited })), [all]);

  return (
    <PointsMap
      points={points}
      loading={pins.isPending}
      countLabel={tr('common.places', { count: points.length })}
      openLabel={tr('worldMap.notYet')}
      renderSelected={(id) => {
        const pin = all.find((p) => p.id === id);
        if (!pin) return null;
        return (
          <>
            <SheetRow
              colors={listColors}
              leading={<RowIcon name="location" />}
              supportingText={
                <Sub>
                  {[
                    pin.category
                      ? `${pin.category.icon ?? ''} ${pin.category.display_name ?? pin.category.name}`.trim()
                      : null,
                    pin.is_visited ? tr('common.visited') : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Sub>
              }>
              {pin.name}
            </SheetRow>
            <SheetRow
              colors={listColors}
              leading={<RowIcon name="pin" />}
              onPress={() => openInMaps(pin.name, pin.latitude, pin.longitude)}>
              {tr('common.openInMaps')}
            </SheetRow>
          </>
        );
      }}
    />
  );
}

function RegionsMap({ code, title }: { code: string; title?: string }) {
  const regions = useRegions(code);
  const visits = useRegionVisits(code);
  const edits = useRegionEdits(code);
  const listColors = useListColors();
  const rows = useMemo(() => regionRows(regions.data ?? [], visits.data ?? []), [regions.data, visits.data]);
  const points = useMemo(() => placed(rows), [rows]);

  return (
    <>
      <Stack.Screen options={{ title: title ?? code }} />
      <PointsMap
        points={points}
        loading={regions.isPending}
        countLabel={tr('worldMap.regions', { count: rows.length })}
        openLabel={tr('worldMap.notVisited')}
        renderSelected={(id, close) => {
          const r = rows.find((x) => x.id === id);
          if (!r) return null;
          return (
            <>
              <VisitToggle
                name={r.name}
                visited={r.visited}
                detail={r.num_cities > 0 ? tr('common.cities', { count: r.num_cities }) : null}
                disabled={!edits.online}
                onPress={() => void (r.visited ? edits.unmarkVisited(r) : edits.markVisited(r))}
              />
              {r.num_cities > 0 ? (
                <SheetRow
                  colors={listColors}
                  leading={<RowIcon name="pin" />}
                  onPress={() => {
                    close();
                    router.push({ pathname: '/world/region/[id]', params: { id: r.id, name: r.name, country: code } });
                  }}>
                  {tr('worldMap.showCities')}
                </SheetRow>
              ) : null}
            </>
          );
        }}
      />
    </>
  );
}

function CitiesMap({ regionId, title }: { regionId: string; title?: string }) {
  const cities = useCities(regionId);
  const visits = useCityVisits(regionId);
  const edits = useCityEdits(regionId);
  const rows = useMemo(() => cityRows(cities.data ?? [], visits.data ?? []), [cities.data, visits.data]);
  const points = useMemo(() => placed(rows), [rows]);

  return (
    <>
      <Stack.Screen options={{ title: title ?? regionId }} />
      <PointsMap
        points={points}
        loading={cities.isPending}
        countLabel={tr('common.cities', { count: rows.length })}
        openLabel={tr('worldMap.notVisited')}
        renderSelected={(id) => {
          const c = rows.find((x) => x.id === id);
          if (!c) return null;
          return (
            <VisitToggle
              name={c.name}
              visited={c.visited}
              disabled={!edits.online}
              onPress={() => void (c.visited ? edits.unmarkVisited(c) : edits.markVisited(c))}
            />
          );
        }}
      />
    </>
  );
}

function VisitToggle(props: {
  name: string;
  visited: boolean;
  detail?: string | null;
  disabled: boolean;
  onPress: () => void;
}) {
  const listColors = useListColors();
  const colors = useColors();
  const hint = props.disabled
    ? tr('common.editingNeedsInternetConnection')
    : props.visited
      ? tr('common.visited')
      : null;
  return (
    <SheetRow
      colors={listColors}
      leading={
        <Icon
          name={icons[props.visited ? 'checked' : 'unchecked']}
          size={22}
          color={props.visited ? colors.tint : colors.secondary}
        />
      }
      supportingText={<Sub>{[props.detail, hint].filter(Boolean).join(' · ')}</Sub>}
      onPress={props.disabled ? undefined : props.onPress}>
      {props.name}
    </SheetRow>
  );
}
