import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { CategoryInput, LocationInput } from '@/api/client';
import { categoryChoices, categoryDraft, categoryLabel } from '@/data/categories';
import { findItem, useCategories, useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { confirmDeleteFromEditor, leaveAfterSave } from '@/ui/editorExit';
import { useDuplicateGuard } from '@/ui/duplicateGuard';
import { useClient } from '@/auth/session';
import { getLanguage, tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { formatDayLabel } from '@/time/tz';
import { useActionSheet } from '@/ui/ActionSheet';
import { defaultCurrency, parsePrice, parseTags, publicRow } from '@/ui/forms';
import { androidToolbarIcon } from '@/ui/icons';
import { useMediaUploads } from '@/ui/media';
import { attachmentEditSection, deleteEditRow, useCurrencySelect } from '@/ui/objectForm';
import { fieldsFromPick } from '@/ui/pickedPlace';
import { usePlaceSearch, type PickedPlace } from '@/ui/PlaceSearch';
import { infoRow, RowIcon, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { Sub } from '@/ui/Sub';
import { useTextPrompt } from '@/ui/TextPrompt';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';

const NEW_CATEGORY = '__new__';

/**
 * Create (`itemId` missing; `day` puts it on that day's plan) or edit a location. A new location starts from a
 * search or the current position.
 */
export default function LocationEditScreen() {
  const { collectionId, itemId, day } = useLocalSearchParams<{ collectionId: string; itemId?: string; day?: string }>();
  const { view } = useCollectionView(collectionId);
  const edits = useCollectionEdits(view);
  const categories = useCategories();
  const rt = useRowTheme();
  const colors = useColors();
  const sheet = useActionSheet(rt);
  const prompt = useTextPrompt(rt);
  const places = usePlaceSearch(rt);
  const location = view ? findItem(view.collection, 'location', itemId) : undefined;

  // Reset uncontrolled inputs only when a picked place supplies new text, never while typing.
  const [placeRevision, setPlaceRevision] = useState(0);
  const [name, setName] = useState(location?.name ?? '');
  const [address, setAddress] = useState(location?.location ?? '');
  const [coords, setCoords] = useState({
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
  });
  const [description, setDescription] = useState(location?.description ?? '');
  const [link, setLink] = useState(location?.link ?? '');
  const [tags, setTags] = useState((location?.tags ?? []).join(', '));
  const [price, setPrice] = useState(location?.price ? String(location.price) : '');
  const [currency, setCurrency] = useState(
    location?.price_currency ?? (view ? defaultCurrency(view.collection) : 'EUR'),
  );
  const [category, setCategory] = useState<CategoryInput | null>(
    location?.category
      ? {
          name: location.category.name,
          display_name: location.category.display_name ?? location.category.name,
          icon: location.category.icon ?? undefined,
        }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(!!location?.is_public);
  const [duplicating, setDuplicating] = useState(false);
  const [fetchingWiki, setFetchingWiki] = useState(false);
  const client = useClient();
  const guardDuplicate = useDuplicateGuard(edits, view);
  const markdown = useMarkdownEditor(rt, description, setDescription);

  // Categories of this collection first, then the user's others; plus the current one and "Neue Kategorie".
  const choices = categoryChoices(
    view?.collection.locations.flatMap((l) => (l.category ? [l.category] : [])) ?? [],
    categories.data ?? [],
    category,
  );
  const categorySelect = useSelect(rt, {
    title: tr('common.category'),
    label: tr('common.category'),
    value: category?.name ?? '',
    options: [
      { value: '', label: tr('locationEdit.none') },
      ...choices.map((c) => ({ value: c.name, label: categoryLabel(c) })),
      { value: NEW_CATEGORY, label: tr('locationEdit.newCategory') },
    ],
    onChange: (v) => {
      if (v === NEW_CATEGORY) {
        prompt.open({
          title: tr('common.newCategory'),
          value: '',
          placeholder: tr('locationEdit.eGFood'),
          onSave: (text) => {
            const draft = categoryDraft(text, choices);
            if (draft) setCategory(draft);
          },
        });
      } else setCategory(v ? (choices.find((c) => c.name === v) ?? null) : null);
    },
  });
  const currencySelect = useCurrencySelect(rt, currency, setCurrency);
  const media = useMediaUploads(rt, edits, sheet, 'location', itemId ?? '');

  if (!view || (itemId && !location)) return null;

  const apply = (p: PickedPlace) => {
    const picked = fieldsFromPick(p, view.collection);
    setPlaceRevision((revision) => revision + 1);
    if (picked.name) setName(picked.name);
    setAddress(picked.address ?? '');
    setCoords({ latitude: picked.latitude, longitude: picked.longitude });
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    const parsedPrice = parsePrice(price);
    if (parsedPrice === undefined) {
      Alert.alert(tr('common.checkPrice'), tr('common.pleaseEnterNumberEG'));
      return;
    }
    const input: LocationInput = {
      name: name.trim(),
      location: address.trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      description: description.trim() || null,
      link: link.trim() || null,
      tags: parseTags(tags),
      price: parsedPrice,
      price_currency: currency,
      is_public: isPublic,
    };
    setSaving(true);
    if (!location && !(await guardDuplicate(input, day))) {
      setSaving(false);
      return;
    }
    const saved = location
      ? await edits.saveLocation(location.id, {
          ...input,
          ...(category && category.name !== location.category?.name ? { category } : {}),
        })
      : await edits.saveLocation(null, { ...input, ...(category ? { category } : {}) }, day);
    setSaving(false);
    if (!saved) return;
    leaveAfterSave('location', { collectionId, savedId: saved.id, created: !location });
  };

  /** Fills the description from Wikipedia; asks before replacing text that is already there. */
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
      { text: tr('common.attach'), onPress: () => setDescription(`${description.trim()}\n\n${withSource}`) },
      { text: tr('locationEdit.replace'), style: 'destructive', onPress: () => setDescription(withSource) },
    ]);
  };

  const duplicate = async () => {
    if (!location || duplicating) return;
    setDuplicating(true);
    const copy = await edits.duplicateLocation(location);
    setDuplicating(false);
    if (copy)
      router.replace({ pathname: '/location/[collectionId]/[itemId]', params: { collectionId, itemId: copy.id } });
  };

  const confirmDelete = () =>
    location &&
    confirmDeleteFromEditor({
      name: location.name,
      consequence: tr('locationEdit.includingVisitsPhotosAttachmentsPlan'),
      onDelete: () => edits.deleteObject('location', location.id),
    });

  const dayNumber = day ? view.days.find((d) => d.date === day)?.number : undefined;

  return (
    <>
      <Stack.Screen options={{ title: location ? tr('locationEdit.editPlace') : tr('common.newPlace') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={!name.trim() || saving || !edits.canEdit}
          onPress={() => void save()}>
          {saving ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost keyboardBar={markdown.keyboardBar}>
        <FieldGroup>
          <FieldGroup.Section title={tr('common.place')}>
            <ListItem
              colors={rt.listColors}
              leading={<RowIcon name="search" />}
              onPress={() => places.start(tr('common.searchPlace'), apply)}>
              {location ? tr('locationEdit.searchAgain') : tr('locationEdit.searchOrUseCurrentLocation')}
            </ListItem>
            <TextInput
              testID="location-name"
              key={`name-${placeRevision}`}
              defaultValue={name}
              onChangeText={setName}
              placeholder={tr('common.name')}
            />
            <TextInput
              testID="location-address"
              key={`addr-${placeRevision}`}
              defaultValue={address}
              onChangeText={setAddress}
              placeholder={tr('common.address')}
              multiline
            />
            {coords.latitude != null && coords.longitude != null
              ? infoRow(rt, {
                  icon: 'pin',
                  label: tr('locationEdit.coordinates'),
                  value: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
                })
              : null}
            {dayNumber ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                  {tr('locationEdit.goesOntoPlanOfDay', { n: dayNumber, date: formatDayLabel(day!) })}
                </Text>
              </FieldGroup.SectionFooter>
            ) : null}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.details')}>
            {categorySelect.row}
            <TextInput
              defaultValue={link}
              onChangeText={setLink}
              placeholder={tr('common.linkHttps')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {markdown.row}
            {edits.can('importImages') && name.trim() ? (
              <ListItem colors={rt.listColors} leading={<RowIcon name="world" />} onPress={() => void fromWikipedia()}>
                {fetchingWiki ? tr('common.loading') : tr('locationEdit.descriptionFromWikipedia')}
              </ListItem>
            ) : null}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.visibility')}>
            {publicRow(rt, isPublic, setIsPublic)}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('locationEdit.tagsPrice')}>
            <TextInput
              testID="location-tags"
              defaultValue={tags}
              onChangeText={setTags}
              placeholder={tr('locationEdit.tagsSeparatedByCommas')}
              autoCorrect={false}
            />
            <TextInput
              defaultValue={price}
              onChangeText={setPrice}
              placeholder={tr('locationEdit.priceEGAdmission')}
              keyboardType="decimal-pad"
            />
            {currencySelect.row}
          </FieldGroup.Section>

          {location
            ? attachmentEditSection(
                rt,
                tr('common.attachments'),
                location.attachments,
                sheet,
                prompt,
                edits,
                media.fileRows,
              )
            : null}

          {location ? (
            <FieldGroup.Section>
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="copy" />}
                onPress={() => void duplicate()}
                supportingText={<Sub>{tr('locationEdit.withPhotosWithoutVisitsAttachments')}</Sub>}>
                {duplicating ? tr('locationEdit.duplicating') : tr('locationEdit.duplicatePlace')}
              </ListItem>
              {deleteEditRow(rt, colors, tr('locationEdit.deletePlace'), confirmDelete)}
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {categorySelect.sheet}
      {currencySelect.sheet}
      {sheet.sheet}
      {prompt.sheet}
      {places.sheet}
    </>
  );
}
