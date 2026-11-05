import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack } from 'expo-router';

import { categoryLabel, sortCategories } from '@/data/categories';
import { useCategoriesWithCount } from '@/data/queries';
import { useOnline } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { androidToolbarIcon } from '@/ui/icons';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';
import { useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Host } from '@/ui/Host';

/** The user's location categories; tap to edit, "+" to add (online only). */
export default function CategoriesScreen() {
  const rt = useRowTheme();
  const categories = useCategoriesWithCount();
  const online = useOnline();
  const sorted = sortCategories(categories.data ?? []);

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('add')}
          accessibilityLabel={tr('common.newCategory')}
          disabled={!online}
          onPress={() => router.push('/category-edit')}>
          {tr('common.new')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Host style={{ flex: 1 }}>
        <RefreshableFieldGroup onRefresh={async () => void (await categories.refetch())}>
          <FieldGroup.Section>
            {sorted.length === 0 ? (
              <ListItem colors={rt.listColors}>
                {categories.isPending ? tr('common.loading') : tr('categories.noCategoriesYet')}
              </ListItem>
            ) : null}
            {sorted.map((c) => (
              <ListItem
                key={c.id}
                colors={rt.listColors}
                supportingText={<Sub>{tr('common.places', { count: c.num_locations ?? 0 })}</Sub>}
                onPress={online ? () => router.push({ pathname: '/category-edit', params: { id: c.id } }) : undefined}>
                {categoryLabel(c)}
              </ListItem>
            ))}
          </FieldGroup.Section>
          {!online ? (
            <FieldGroup.Section>
              <ListItem colors={rt.listColors}>{tr('common.editingNeedsInternetConnection')}</ListItem>
            </FieldGroup.Section>
          ) : null}
        </RefreshableFieldGroup>
      </Host>
    </>
  );
}
