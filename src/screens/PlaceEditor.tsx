import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { CategoryInput } from '@/api/client';
import type { Location } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { categoryChoices, categoryDraft, categoryLabel } from '@/data/categories';
import { fetchLinkPreview, placeFieldsFromPreview } from '@/data/linkPreview';
import { useCategories, useCollections, useUser } from '@/data/queries';
import { useLocationAction } from '@/data/useLocation';
import { getLanguage, tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { publicRow } from '@/ui/forms';
import { parsePrice, parseTags } from '@/ui/formValues';
import { androidToolbarIcon } from '@/ui/icons';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { useCurrencySelect } from '@/ui/objectForm';
import { fieldsFromPick } from '@/ui/pickedPlace';
import { usePlaceSearch } from '@/ui/PlaceSearch';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { useTextPrompt } from '@/ui/TextPrompt';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';

const NEW_CATEGORY = '__new__';

/** Location editing is independent of collection membership; adding a collection is optional. */
export function PlaceEditor({ location, sharedLink }: { location?: Location; sharedLink?: string }) {
  const client = useClient();
  const action = useLocationAction(location?.id);
  const categories = useCategories();
  const user = useUser();
  const rt = useRowTheme();
  const places = usePlaceSearch(rt);
  const prompt = useTextPrompt(rt);
  const [name, setName] = useState(location?.name ?? '');
  const [address, setAddress] = useState(location?.location ?? '');
  const [description, setDescription] = useState(location?.description ?? '');
  const [link, setLink] = useState(location?.link ?? sharedLink ?? '');
  const [latitude, setLatitude] = useState(location?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(location?.longitude?.toString() ?? '');
  const [tags, setTags] = useState((location?.tags ?? []).join(', '));
  const [price, setPrice] = useState(location?.price ? String(location.price) : '');
  const [currency, setCurrency] = useState(location?.price_currency ?? user.data?.default_currency ?? 'EUR');
  const [isPublic, setIsPublic] = useState(!!location?.is_public);
  const [category, setCategory] = useState<CategoryInput | null>(
    location?.category
      ? {
          name: location.category.name,
          display_name: location.category.display_name ?? location.category.name,
          icon: location.category.icon ?? undefined,
        }
      : null,
  );
  const [collectionId, setCollectionId] = useState('none');
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [readingLink, setReadingLink] = useState(false);
  const [fetchingWiki, setFetchingWiki] = useState(false);
  const [coordinateError, setCoordinateError] = useState(false);
  const markdown = useMarkdownEditor(rt, description, setDescription);
  const collections = useCollections();
  const choices = categoryChoices([], categories.data ?? [], category);
  const categorySelect = useSelect(rt, {
    title: tr('common.category'),
    label: tr('common.category'),
    value: category?.name ?? '',
    options: [
      { value: '', label: tr('locationEdit.none') },
      ...choices.map((c) => ({ value: c.name, label: categoryLabel(c) })),
      { value: NEW_CATEGORY, label: tr('locationEdit.newCategory') },
    ],
    onChange: (value) => {
      if (value === NEW_CATEGORY) {
        prompt.open({
          title: tr('common.newCategory'),
          value: '',
          placeholder: tr('locationEdit.eGFood'),
          onSave: (text) => {
            const draft = categoryDraft(text, choices);
            if (draft) setCategory(draft);
          },
        });
      } else setCategory(value ? (choices.find((c) => c.name === value) ?? null) : null);
    },
  });
  const currencySelect = useCurrencySelect(rt, currency, setCurrency);
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

  const applyPreview = useCallback(
    (page: string, preview: { title: string | null; description: string | null; imageUrl: string | null }) => {
      const fields = placeFieldsFromPreview(page, preview);
      if (!fields.name && !fields.description && !fields.imageUrl) {
        Alert.alert(tr('places.fillFromLink'), tr('places.linkEmpty'));
        return;
      }
      const nextName = fields.name;
      const nextDescription = fields.description;
      if (nextName) setName((current) => (current.trim() ? current : nextName));
      if (nextDescription) setDescription((current) => (current.trim() ? current : nextDescription));
      if (fields.imageUrl) setPictureUrl(fields.imageUrl);
      setRevision((n) => n + 1);
    },
    [],
  );

  const fromLink = useCallback(async () => {
    const page = link.trim();
    if (readingLink || !/^https?:\/\/\S+$/i.test(page)) return;
    setReadingLink(true);
    try {
      const preview = await fetchLinkPreview(page);
      setReadingLink(false);
      if (!preview) {
        Alert.alert(tr('places.fillFromLink'), tr('places.linkUnread'));
        return;
      }
      applyPreview(page, preview);
    } catch {
      setReadingLink(false);
      Alert.alert(tr('places.fillFromLink'), tr('places.linkUnread'));
    }
  }, [applyPreview, link, readingLink]);

  const fromWikipedia = async () => {
    if (!name.trim() || fetchingWiki) return;
    setFetchingWiki(true);
    let page: Awaited<ReturnType<typeof client.wikipediaDescription>> = null;
    try {
      page = await client.wikipediaDescription(name.trim(), getLanguage());
    } catch {
      setFetchingWiki(false);
      Alert.alert(tr('locationEdit.wikipediaNotReachable'), tr('common.notReachableRightNowTry'));
      return;
    }
    setFetchingWiki(false);
    const text = page?.extract?.trim();
    if (!text) {
      Alert.alert(tr('common.nothingFound'), tr('locationEdit.wikipediaHasNoArticleOn', { name: name.trim() }));
      return;
    }
    const withSource = `${text}\n\n${tr('locationEdit.sourceWikipediaTitle', { title: page?.title ?? name.trim() })}`;
    if (!description.trim()) return setDescription(withSource);
    Alert.alert(tr('locationEdit.replaceDescriptionConfirm'), text.slice(0, 200) + (text.length > 200 ? ' …' : ''), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('locationEdit.replace'), onPress: () => setDescription(withSource) },
    ]);
  };

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
    const parsedPrice = parsePrice(price);
    if (parsedPrice === undefined) {
      Alert.alert(tr('common.checkPrice'), tr('common.pleaseEnterNumberEG'));
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
      tags: parseTags(tags),
      price: parsedPrice,
      price_currency: currency,
      is_public: isPublic,
      ...(category && category.name !== location?.category?.name ? { category } : {}),
    };
    const saved = await action.run(() =>
      location
        ? client.edit.updateLocation(location.id, input)
        : client.edit.createLocation({ ...input, collection: collectionId === 'none' ? undefined : collectionId }),
    );
    if (saved && pictureUrl) {
      try {
        const imported = await client.edit.importImages('location', saved.id, [pictureUrl], 'url');
        if (!imported.created_count) Alert.alert(tr('places.fillFromLink'), tr('places.pictureNotSaved'));
      } catch {
        Alert.alert(tr('places.fillFromLink'), tr('places.pictureNotSaved'));
      }
    }
    setSaving(false);
    if (saved) {
      if (location) router.back();
      else router.replace({ pathname: '/place/[id]', params: { id: saved.id } });
    }
  };

  const openedFromShare = useRef(false);
  useEffect(() => {
    if (location || !sharedLink || openedFromShare.current) return;
    openedFromShare.current = true;
    void fromLink();
  }, [fromLink, location, sharedLink]);

  const linkReady = /^https?:\/\/\S+$/i.test(link.trim());
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
                  const fields = fieldsFromPick(picked, null);
                  setName(fields.name);
                  setAddress(fields.address ?? '');
                  setLatitude(String(fields.latitude));
                  setLongitude(String(fields.longitude));
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
          <FieldGroup.Section>{categorySelect.row}</FieldGroup.Section>
          <FieldGroup.Section title={tr('common.description')}>
            {markdown.row}
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="world" />}
              onPress={name.trim() && action.online && !fetchingWiki ? () => void fromWikipedia() : undefined}>
              {fetchingWiki ? tr('common.loading') : tr('locationEdit.descriptionFromWikipedia')}
            </ListItem>
            <TextInput
              key={`link-${revision}`}
              defaultValue={link}
              onChangeText={setLink}
              placeholder={tr('places.website')}
              autoCapitalize="none"
              keyboardType="url"
            />
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="link" />}
              onPress={linkReady && action.online && !readingLink ? () => void fromLink() : undefined}>
              {readingLink ? tr('common.loading') : tr('places.fillFromLink')}
            </ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('locationEdit.tagsPrice')}>
            <TextInput
              defaultValue={tags}
              onChangeText={setTags}
              placeholder={tr('locationEdit.tagsSeparatedByCommas')}
              autoCapitalize="none"
            />
            <TextInput
              defaultValue={price}
              onChangeText={setPrice}
              placeholder={tr('locationEdit.priceEGAdmission')}
              keyboardType="decimal-pad"
            />
            {currencySelect.row}
          </FieldGroup.Section>
          <FieldGroup.Section>{publicRow(rt, isPublic, setIsPublic)}</FieldGroup.Section>
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
      {categorySelect.sheet}
      {currencySelect.sheet}
      {prompt.sheet}
    </>
  );
}
