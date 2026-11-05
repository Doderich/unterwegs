import { FieldGroup, ListItem, TextInput } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { categoryName, GENERAL_CATEGORY } from '@/data/categories';
import { queryKeys, useCategoriesWithCount } from '@/data/queries';
import { useOnlineAction } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { androidToolbarIcon } from '@/ui/icons';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { useClient } from '@/auth/session';
import { Host } from '@/ui/Host';

/** Create (`id` missing) or edit a category: shown name and emoji icon. */
export default function CategoryEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const client = useClient();
  const categories = useCategoriesWithCount();
  const { run } = useOnlineAction();
  const rt = useRowTheme();
  const colors = useColors();
  const category = id ? categories.data?.find((c) => c.id === id) : undefined;

  const [displayName, setDisplayName] = useState(category?.display_name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [saving, setSaving] = useState(false);

  if (id && !category) return null;
  // Locations that would lose it: refetch the collections too, their locations embed the category.
  const refetch = [queryKeys.categories, queryKeys.categoriesWithCount, ['collection'], queryKeys.world.pins];

  const save = async () => {
    const name = displayName.trim();
    if (!name || saving) return;
    setSaving(true);
    const input = { display_name: name, icon: icon.trim() || '📍' };
    const saved = await run(
      () =>
        category
          ? client.edit.updateCategory(category.id, input)
          : client.edit.createCategory({ ...input, name: categoryName(name, categories.data ?? []) }),
      refetch,
    );
    setSaving(false);
    if (saved) router.back();
  };

  const confirmDelete = () =>
    category &&
    Alert.alert(
      tr('common.deleteNameConfirm', { name: category.display_name || category.name }),
      category.num_locations
        ? tr('categoryEdit.locationsMoveToGeneral', { count: category.num_locations })
        : tr('common.cantUndone'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (await run(() => client.edit.deleteCategory(category.id), refetch)) router.back();
          },
        },
      ],
    );

  return (
    <>
      <Stack.Screen options={{ title: category ? tr('categoryEdit.editCategory') : tr('common.newCategory') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={!displayName.trim() || saving}
          onPress={() => void save()}>
          {saving ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title={tr('common.name')}>
            <TextInput
              defaultValue={displayName}
              onChangeText={setDisplayName}
              placeholder={tr('categoryEdit.eGTemple')}
              autoFocus={!category}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('categoryEdit.icon')}>
            <TextInput defaultValue={icon} onChangeText={setIcon} placeholder="⛩️" autoCorrect={false} />
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                {tr('categoryEdit.oneEmojiAsOnWebsite')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          {category && category.name !== GENERAL_CATEGORY ? (
            <FieldGroup.Section>
              <ListItem
                colors={{ ...rt.listColors, contentColor: colors.danger }}
                leading={<RowIcon name="delete" color={colors.danger} />}
                onPress={confirmDelete}>
                {tr('categoryEdit.deleteCategory')}
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
    </>
  );
}
