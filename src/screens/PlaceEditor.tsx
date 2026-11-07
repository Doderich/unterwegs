import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useState } from 'react';

import type { Location } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { useCollections } from '@/data/queries';
import { useLocationAction } from '@/data/useLocation';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { usePlaceSearch } from '@/ui/PlaceSearch';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { androidToolbarIcon } from '@/ui/icons';
import { Text } from '@/ui/Text';
import { useSelect } from '@/ui/Select';
import { TextInput } from '@/ui/TextInput';

/** Location editing is independent of collection membership; adding a collection is optional. */
export function PlaceEditor({ location }: { location?: Location }) {
  const client = useClient();
  const action = useLocationAction(location?.id);
  const collections = useCollections();
  const rt = useRowTheme();
  const places = usePlaceSearch(rt);
  const [name, setName] = useState(location?.name ?? '');
  const [address, setAddress] = useState(location?.location ?? '');
  const [description, setDescription] = useState(location?.description ?? '');
  const [link, setLink] = useState(location?.link ?? '');
  const [latitude, setLatitude] = useState(location?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(location?.longitude?.toString() ?? '');
  const [collectionId, setCollectionId] = useState('none');
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [coordinateError, setCoordinateError] = useState(false);
  const markdown = useMarkdownEditor(rt, description, setDescription);
  const select = useSelect(rt, {
    title: tr('places.collection'),
    label: tr('places.collection'),
    value: collectionId,
    onChange: setCollectionId,
    options: [
      { value: 'none', label: tr('places.standalone') },
      ...(collections.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
  });
  const save = async () => {
    if (saving || !name.trim()) return;
    const lat = latitude.trim() ? Number(latitude.replace(',', '.')) : null;
    const lon = longitude.trim() ? Number(longitude.replace(',', '.')) : null;
    if (
      (lat === null) !== (lon === null) ||
      (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
      (lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180))
    ) {
      setCoordinateError(true);
      return;
    }
    setCoordinateError(false);
    setSaving(true);
    const input = {
      name: name.trim(),
      location: address.trim() || null,
      description: description.trim() || null,
      link: link.trim() || null,
      latitude: lat,
      longitude: lon,
    };
    const saved = await action.run(() =>
      location
        ? client.edit.updateLocation(location.id, input)
        : client.edit.createLocation({ ...input, collection: collectionId === 'none' ? undefined : collectionId }),
    );
    setSaving(false);
    if (saved) {
      if (location) router.back();
      else router.replace({ pathname: '/place/[id]', params: { id: saved.id } });
    }
  };
  return (
    <>
      <Stack.Screen options={{ title: location ? tr('places.edit') : tr('common.newPlace') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={saving || !action.online || !name.trim()}
          onPress={() => void save()}>
          {saving ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost keyboardBar={markdown.keyboardBar}>
        <FieldGroup>
          <FieldGroup.Section>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="search" />}
              onPress={() =>
                places.start(tr('common.searchPlace'), (picked) => {
                  setName(picked.name);
                  setAddress(picked.address ?? '');
                  setLatitude(String(picked.latitude));
                  setLongitude(String(picked.longitude));
                  setRevision((n) => n + 1);
                })
              }>
              {tr('common.searchPlace')}
            </ListItem>
            <TextInput
              key={`name-${revision}`}
              defaultValue={name}
              onChangeText={setName}
              placeholder={tr('places.name')}
            />
            <TextInput
              key={`address-${revision}`}
              defaultValue={address}
              onChangeText={setAddress}
              placeholder={tr('common.address')}
            />
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('places.coordinates')}>
            <TextInput
              key={`lat-${revision}`}
              defaultValue={latitude}
              onChangeText={setLatitude}
              placeholder={tr('places.latitude')}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              key={`lon-${revision}`}
              defaultValue={longitude}
              onChangeText={setLongitude}
              placeholder={tr('places.longitude')}
              keyboardType="numbers-and-punctuation"
            />
            {coordinateError ? (
              <Text textStyle={{ color: rt.colors.danger }}>{tr('places.invalidCoordinates')}</Text>
            ) : null}
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('common.description')}>
            {markdown.row}
            <TextInput
              defaultValue={link}
              onChangeText={setLink}
              placeholder={tr('places.website')}
              autoCapitalize="none"
            />
          </FieldGroup.Section>
          {!location ? (
            <FieldGroup.Section>
              {select.row}
              <FieldGroup.SectionFooter>
                <Text textStyle={{ color: rt.colors.secondary }}>{tr('places.noCollectionNeeded')}</Text>
              </FieldGroup.SectionFooter>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {places.sheet}
      {select.sheet}
    </>
  );
}
