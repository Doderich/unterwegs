import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { usePublicUsers } from '@/data/queries';
import { tr } from '@/i18n';
import { personName as displayName } from '@/ui/format';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';
import { TextInput } from '@/ui/TextInput';

/** Everyone on the server with a public profile (like the website's user list). */
export default function PeopleScreen() {
  const rt = useRowTheme();
  const users = usePublicUsers(true);
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users.data ?? [])
      .filter((u) => !q || `${displayName(u)} ${u.username}`.toLowerCase().includes(q))
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [users.data, query]);

  return (
    <Host style={{ flex: 1 }}>
      <RefreshableFieldGroup onRefresh={async () => void (await users.refetch())}>
        <FieldGroup.Section>
          <TextInput
            defaultValue={query}
            onChangeText={setQuery}
            placeholder={tr('people.searchByName')}
            autoCorrect={false}
          />
        </FieldGroup.Section>
        <FieldGroup.Section title={users.data ? tr('people.publicProfiles', { count: users.data.length }) : undefined}>
          {shown.length === 0 ? (
            <ListItem colors={rt.listColors}>
              {users.isPending
                ? tr('common.loading')
                : users.isError
                  ? tr('common.couldNotLoadedPullRefresh')
                  : tr('people.nobodyFound')}
            </ListItem>
          ) : null}
          {shown.map((u) => (
            <ListItem
              key={u.uuid}
              colors={rt.listColors}
              leading={<RowIcon name="group" />}
              supportingText={<Sub>{`@${u.username}`}</Sub>}
              onPress={() => router.push({ pathname: '/people/[username]', params: { username: u.username } })}>
              {displayName(u)}
            </ListItem>
          ))}
        </FieldGroup.Section>
      </RefreshableFieldGroup>
    </Host>
  );
}
