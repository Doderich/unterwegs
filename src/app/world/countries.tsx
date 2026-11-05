import { FieldGroup, ListItem, TextInput } from '@expo/ui';
import { router } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';

import { useCountries } from '@/data/queries';
import { countrySections, flagEmoji } from '@/data/world';
import { tr } from '@/i18n';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { useRowTheme, type RowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';

type Row = ReturnType<typeof countrySections>['visited'][number];

/** All countries, visited ones first, with a search field. */
export default function CountriesScreen() {
  const rt = useRowTheme();
  const countries = useCountries();
  const [query, setQuery] = useState('');
  const sections = useMemo(() => countrySections(countries.data ?? [], query), [countries.data, query]);
  const empty = sections.visited.length === 0 && sections.other.length === 0;

  return (
    <Host style={{ flex: 1 }}>
      <RefreshableFieldGroup onRefresh={async () => void (await countries.refetch())}>
        <FieldGroup.Section>
          <TextInput defaultValue="" onChangeText={setQuery} placeholder={tr('worldCountries.searchCountries')} />
        </FieldGroup.Section>
        {empty ? (
          <FieldGroup.Section>
            <ListItem colors={rt.listColors}>
              {countries.isPending ? tr('common.loading') : tr('worldCountries.noCountryFound')}
            </ListItem>
          </FieldGroup.Section>
        ) : null}
        {sections.visited.length > 0 ? (
          <FieldGroup.Section title={tr('worldCountries.visited')}>
            {sections.visited.map((c) => countryRow(rt, c))}
          </FieldGroup.Section>
        ) : null}
        {sections.other.length > 0 ? (
          <FieldGroup.Section title={sections.visited.length > 0 ? tr('worldCountries.otherCountries') : undefined}>
            {sections.other.map((c) => countryRow(rt, c))}
          </FieldGroup.Section>
        ) : null}
      </RefreshableFieldGroup>
    </Host>
  );
}

function countryRow(rt: RowTheme, c: Row): ReactElement {
  const regions =
    c.num_visits > 0
      ? tr('common.nOfTotalRegions', { n: c.num_visits, total: c.num_regions })
      : tr('worldCountries.regions', { count: c.num_regions });
  return (
    <ListItem
      key={c.country_code}
      colors={rt.listColors}
      leading={<Sub>{flagEmoji(c.country_code)}</Sub>}
      supportingText={<Sub>{[regions, c.subregion].filter(Boolean).join(' · ')}</Sub>}
      onPress={() => router.push({ pathname: '/world/[code]', params: { code: c.country_code, name: c.displayName } })}>
      {c.displayName}
    </ListItem>
  );
}
