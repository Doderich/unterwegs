import { FieldGroup, ListItem } from '@expo/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { TransportationInput } from '@/api/client';
import { findItem, useCollectionView } from '@/data/queries';
import { zoneOn } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { confirmDeleteFromEditor, leaveAfterSave } from '@/ui/editorExit';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { deviceTimeZone, formatDateTime, formatDuration } from '@/time/tz';
import { arrivalZone, departureZone } from '@/time/ownZone';
import { utcToZoned } from '@/time/zonedInput';
import { useActionSheet } from '@/ui/ActionSheet';
import { useZoneSelect } from '@/ui/DateTimeRow';
import { defaultCurrency, parsePrice, ratingStars } from '@/ui/forms';
import { androidToolbarIcon, transportLabel } from '@/ui/icons';
import { useMediaUploads } from '@/ui/media';
import { objectEditorTail, priceLinkFields, useCurrencySelect, useRatingSelect } from '@/ui/objectForm';
import { fieldsFromPick } from '@/ui/pickedPlace';
import { usePlaceSearch } from '@/ui/PlaceSearch';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { useTextPrompt } from '@/ui/TextPrompt';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';
import { useZonedMoment } from '@/ui/zonedMoment';

const TYPES = ['plane', 'train', 'bus', 'boat', 'car', 'bike', 'walking', 'other'];

type End = { place: string; code: string; latitude: number | null; longitude: number | null };

/**
 * Create (`itemId` missing; `day` presets the departure date) or edit a transportation. Departure and arrival are
 * each typed in their own zone, as printed on the ticket.
 */
export default function TransportEditScreen() {
  const { collectionId, itemId, day, fromShare } = useLocalSearchParams<{
    collectionId: string;
    itemId?: string;
    day?: string;
    fromShare?: string;
  }>();
  const { view } = useCollectionView(collectionId);
  const edits = useCollectionEdits(view);
  const rt = useRowTheme();
  const colors = useColors();
  const sheet = useActionSheet(rt);
  const prompt = useTextPrompt(rt);
  const places = usePlaceSearch(rt, { withCurrentPosition: false });
  const t = view ? findItem(view.collection, 'transportation', itemId) : undefined;

  const init = (() => {
    const fallbackZone = view ? zoneOn(view, day) : 'UTC';
    const startZone = departureZone(t ?? {}, fallbackZone);
    const endZone = arrivalZone(t ?? {}, fallbackZone);
    const date = day ?? view?.days[0]?.date ?? '2000-01-01';
    return {
      startZone,
      endZone,
      dep: t?.date ? utcToZoned(t.date, startZone) : { date, time: '09:00' },
      arr: t?.end_date ? utcToZoned(t.end_date, endZone) : { date, time: '11:00' },
    };
  })();

  const [type, setType] = useState(t?.type ?? 'train');
  const [name, setName] = useState(t?.name ?? '');
  const [number, setNumber] = useState(t?.flight_number ?? '');
  // Remount an endpoint input for a search selection, never for the text being typed.
  const [placeRevisions, setPlaceRevisions] = useState({ from: 0, to: 0 });
  const [from, setFrom] = useState<End>({
    place: t?.from_location ?? '',
    code: t?.start_code ?? '',
    latitude: t?.origin_latitude ?? null,
    longitude: t?.origin_longitude ?? null,
  });
  const [to, setTo] = useState<End>({
    place: t?.to_location ?? '',
    code: t?.end_code ?? '',
    latitude: t?.destination_latitude ?? null,
    longitude: t?.destination_longitude ?? null,
  });
  const [startZone, setStartZone] = useState(init.startZone);
  const [endZone, setEndZone] = useState(init.endZone);
  const dep = useZonedMoment(rt, {
    initial: init.dep,
    zone: startZone,
    dateLabel: tr('common.departure'),
    timeLabel: tr('transportEdit.departureTime'),
  });
  const arr = useZonedMoment(rt, {
    initial: init.arr,
    zone: endZone,
    dateLabel: tr('common.arrival'),
    timeLabel: tr('transportEdit.arrivalTime'),
  });
  const [price, setPrice] = useState(t?.price ? String(t.price) : '');
  const [currency, setCurrency] = useState(t?.price_currency ?? (view ? defaultCurrency(view.collection) : 'EUR'));
  const [link, setLink] = useState(t?.link ?? '');
  const [rating, setRating] = useState(ratingStars(t?.rating));
  const [description, setDescription] = useState(t?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(!!t?.is_public);
  const markdown = useMarkdownEditor(rt, description, setDescription);

  const zones = view
    ? [
        view.timeZone,
        ...view.collection.lodging.flatMap((l) => (l.timezone ? [l.timezone] : [])),
        ...view.collection.transportations.flatMap((x) =>
          [x.start_timezone, x.end_timezone].filter((z): z is string => !!z),
        ),
        deviceTimeZone(),
      ]
    : [];
  const typeSelect = useSelect(rt, {
    title: tr('common.type'),
    label: tr('common.type'),
    value: type,
    onChange: setType,
    options: TYPES.map((x) => ({ value: x, label: x === 'other' ? tr('common.other') : transportLabel(x) })),
  });
  const startZoneSelect = useZoneSelect(rt, {
    label: tr('transportEdit.departureTimeZone'),
    value: startZone,
    suggestions: zones,
    at: `${dep.date}T12:00:00Z`,
    onChange: setStartZone,
  });
  const endZoneSelect = useZoneSelect(rt, {
    label: tr('transportEdit.arrivalTimeZone'),
    value: endZone,
    suggestions: [startZone, ...zones],
    at: `${arr.date}T12:00:00Z`,
    onChange: setEndZone,
  });
  const currencySelect = useCurrencySelect(rt, currency, setCurrency);
  const ratingSelect = useRatingSelect(rt, rating, setRating);
  const media = useMediaUploads(rt, edits, sheet, 'transportation', itemId ?? '');

  if (!view || (itemId && !t)) return null;

  const departure = dep.iso;
  const arrival = arr.iso;
  const minutes = Math.round((Date.parse(arrival) - Date.parse(departure)) / 60_000);
  const title = name.trim() || [from.place, to.place].filter(Boolean).join(' → ');

  const save = async () => {
    if (!title || saving) return;
    if (minutes <= 0) {
      Alert.alert(tr('common.checkTime'), tr('transportEdit.arrivalMustAfterDeparture'));
      return;
    }
    const parsedPrice = parsePrice(price);
    if (parsedPrice === undefined) {
      Alert.alert(tr('common.checkPrice'), tr('common.pleaseEnterNumberEG'));
      return;
    }
    const input: TransportationInput = {
      type,
      name: title,
      flight_number: number.trim() || null,
      from_location: from.place.trim() || null,
      to_location: to.place.trim() || null,
      start_code: from.code.trim().toUpperCase() || null,
      end_code: to.code.trim().toUpperCase() || null,
      origin_latitude: from.latitude,
      origin_longitude: from.longitude,
      destination_latitude: to.latitude,
      destination_longitude: to.longitude,
      date: departure,
      end_date: arrival,
      start_timezone: startZone,
      end_timezone: endZone,
      price: parsedPrice,
      price_currency: currency,
      link: link.trim() || null,
      description: description.trim() || null,
      rating: rating || null,
      is_public: isPublic,
    };
    setSaving(true);
    const saved = await edits.saveTransportation(t ? t.id : null, input);
    setSaving(false);
    if (!saved) return;
    leaveAfterSave('transportation', { collectionId, savedId: saved.id, created: !t, fromShare: fromShare === '1' });
  };

  const searchEnd = (which: 'from' | 'to') =>
    places.start(
      which === 'from' ? tr('transportEdit.searchDeparture') : tr('transportEdit.searchDestination'),
      (p) => {
        const picked = fieldsFromPick(p, view.collection);
        setPlaceRevisions((revisions) => ({ ...revisions, [which]: revisions[which] + 1 }));
        const end = { place: picked.name, latitude: picked.latitude, longitude: picked.longitude };
        if (which === 'from') {
          setFrom((f) => ({ ...f, ...end }));
          if (picked.zone) setStartZone(picked.zone);
        } else {
          setTo((x) => ({ ...x, ...end }));
          if (picked.zone) setEndZone(picked.zone);
        }
      },
    );

  const confirmDelete = () =>
    t &&
    confirmDeleteFromEditor({
      name: t.name,
      consequence: tr('common.includingPhotosAttachmentsPlanEntries'),
      onDelete: () => edits.deleteObject('transportation', t.id),
    });

  const endSection = (which: 'from' | 'to') => {
    const end = which === 'from' ? from : to;
    const set = which === 'from' ? setFrom : setTo;
    return (
      <>
        <TextInput
          testID={`transport-${which}`}
          key={`${which}-${placeRevisions[which]}`}
          defaultValue={end.place}
          onChangeText={(v) => set((e) => ({ ...e, place: v }))}
          placeholder={
            which === 'from' ? tr('transportEdit.fromPlaceStationAirport') : tr('transportEdit.placeStationAirport')
          }
        />
        <TextInput
          defaultValue={end.code}
          onChangeText={(v) => set((e) => ({ ...e, code: v }))}
          placeholder={tr('transportEdit.codeEGFra')}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <ListItem colors={rt.listColors} leading={<RowIcon name="search" />} onPress={() => searchEnd(which)}>
          {tr('common.searchPlace')}
        </ListItem>
      </>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: t ? tr('transportEdit.editConnection') : tr('common.newConnection') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={androidToolbarIcon('check')}
          accessibilityLabel={tr('common.save')}
          disabled={!title || saving || !edits.canEdit}
          onPress={() => void save()}>
          {saving ? tr('common.saving') : tr('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <FormHost keyboardBar={markdown.keyboardBar}>
        <FieldGroup>
          <FieldGroup.Section>
            {typeSelect.row}
            <TextInput
              defaultValue={number}
              onChangeText={setNumber}
              placeholder={tr('transportEdit.flightTrainNumber')}
              autoCorrect={false}
            />
            <TextInput defaultValue={name} onChangeText={setName} placeholder={tr('transportEdit.nameEmptyFrom')} />
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.departure')}>
            {endSection('from')}
            {startZoneSelect.row}
            {dep.rows}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.arrival')}>
            {endSection('to')}
            {endZoneSelect.row}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: colors.secondary, fontSize: 13 }}>
                {tr('common.placeSearchSuggestsTimeZone')}
              </Text>
            </FieldGroup.SectionFooter>
            {arr.rows}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: minutes > 0 ? colors.secondary : colors.danger }}>
                {minutes > 0
                  ? [
                      tr('transportEdit.durationD', { d: formatDuration(minutes) }),
                      startZone !== view.timeZone || endZone !== view.timeZone
                        ? tr('transportEdit.inZoneDepArr', {
                            zone: view.timeZone,
                            dep: formatDateTime(departure, view.timeZone),
                            arr: formatDateTime(arrival, view.timeZone),
                          })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : tr('transportEdit.arrivalMustAfterDeparture')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.booking')}>
            {priceLinkFields({
              price,
              onPrice: setPrice,
              pricePlaceholder: tr('common.price'),
              currencyRow: currencySelect.row,
              link,
              onLink: setLink,
            })}
          </FieldGroup.Section>

          {objectEditorTail(rt, colors, {
            isPublic,
            onPublic: setIsPublic,
            ratingRow: ratingSelect.row,
            notes: markdown.row,
            attachments: t ? t.attachments : null,
            attachmentTitle: tr('common.ticketsAttachments'),
            sheet,
            prompt,
            edits,
            fileRows: media.fileRows,
            deleteLabel: tr('transportEdit.deleteConnection'),
            onDelete: t ? confirmDelete : undefined,
          })}
        </FieldGroup>
      </FormHost>
      {typeSelect.sheet}
      {startZoneSelect.sheet}
      {endZoneSelect.sheet}
      {currencySelect.sheet}
      {ratingSelect.sheet}
      {dep.sheets}
      {arr.sheets}
      {sheet.sheet}
      {prompt.sheet}
      {places.sheet}
    </>
  );
}
