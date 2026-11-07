import { suggestedZone } from '@/time/placeZone';
import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { LodgingInput } from '@/api/client';
import { realIdFor } from '@/data/outbox';
import { useCollectionView } from '@/data/queries';
import { changedFields, nearestZone } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { useInitialInputFocus } from '@/ui/useInitialInputFocus';
import { deviceTimeZone, formatDateTime } from '@/time/tz';
import { utcToZoned, zonedToUtc } from '@/time/zonedInput';
import { useActionSheet } from '@/ui/ActionSheet';
import { useDateTimeRow, useZoneSelect } from '@/ui/DateTimeRow';
import {
  attachmentEditRows,
  currencyOptions,
  defaultCurrency,
  nextDate,
  parsePrice,
  publicRow,
  ratingOptions,
  ratingStars,
} from '@/ui/forms';
import { androidToolbarIcon, lodgingTypeLabel } from '@/ui/icons';
import { useMediaUploads } from '@/ui/media';
import { usePlaceSearch } from '@/ui/PlaceSearch';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { useSelect } from '@/ui/Select';
import { useTextPrompt } from '@/ui/TextPrompt';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';

const TYPES = [
  'hotel',
  'hostel',
  'resort',
  'bnb',
  'campground',
  'cabin',
  'apartment',
  'house',
  'villa',
  'motel',
  'other',
];

/** Create (`itemId` missing; `day` presets the check-in date) or edit a lodging. Times are in the lodging's zone. */
export default function LodgingEditScreen() {
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
  const lodging = itemId ? view?.collection.lodging.find((l) => l.id === realIdFor(itemId)) : undefined;

  const init = (() => {
    const zone =
      lodging?.timezone ?? view?.days.find((d) => d.date === day)?.nightLodging?.timezone ?? view?.timeZone ?? 'UTC';
    const inDate = day ?? view?.days[0]?.date ?? '2000-01-01';
    const checkIn = lodging?.check_in ? utcToZoned(lodging.check_in, zone) : { date: inDate, time: '15:00' };
    const checkOut = lodging?.check_out
      ? utcToZoned(lodging.check_out, zone)
      : { date: nextDate(checkIn.date), time: '10:00' };
    return { zone, checkIn, checkOut };
  })();

  const initialFocus = useInitialInputFocus(!lodging);
  const [name, setName] = useState(lodging?.name ?? '');
  const [type, setType] = useState(lodging?.type ?? 'hotel');
  const [zone, setZone] = useState(init.zone);
  const [inDate, setInDate] = useState(init.checkIn.date);
  const [inTime, setInTime] = useState(init.checkIn.time);
  const [outDate, setOutDate] = useState(init.checkOut.date);
  const [outTime, setOutTime] = useState(init.checkOut.time);
  const [reservation, setReservation] = useState(lodging?.reservation_number ?? '');
  const [price, setPrice] = useState(lodging?.price ? String(lodging.price) : '');
  const [currency, setCurrency] = useState(
    lodging?.price_currency ?? (view ? defaultCurrency(view.collection) : 'EUR'),
  );
  const [link, setLink] = useState(lodging?.link ?? '');
  const [rating, setRating] = useState(ratingStars(lodging?.rating));
  // A search selection replaces uncontrolled text; keystrokes must retain the input instance.
  const [placeRevision, setPlaceRevision] = useState(0);
  const [address, setAddress] = useState(lodging?.location ?? '');
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: lodging?.latitude ?? null,
    longitude: lodging?.longitude ?? null,
  });
  const [description, setDescription] = useState(lodging?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(!!lodging?.is_public);
  const markdown = useMarkdownEditor(rt, description, setDescription);

  const typeSelect = useSelect(rt, {
    title: tr('common.type'),
    label: tr('common.type'),
    value: type,
    onChange: setType,
    options: TYPES.map((t) => ({ value: t, label: lodgingTypeLabel(t) ?? tr('common.other') })),
  });
  const zoneSelect = useZoneSelect(rt, {
    label: tr('common.timeZone'),
    value: zone,
    suggestions: view
      ? [view.timeZone, ...view.collection.lodging.flatMap((l) => (l.timezone ? [l.timezone] : [])), deviceTimeZone()]
      : [],
    at: `${inDate}T12:00:00Z`,
    onChange: setZone,
  });
  const currencySelect = useSelect(rt, {
    title: tr('common.currency'),
    label: tr('common.currency'),
    value: currency,
    onChange: setCurrency,
    options: currencyOptions(currency),
  });
  const ratingSelect = useSelect(rt, {
    title: tr('common.rating'),
    label: tr('common.rating'),
    value: String(rating),
    onChange: (v) => setRating(Number(v)),
    options: ratingOptions(),
  });
  const inDateRow = useDateTimeRow(rt, {
    label: tr('common.checkin'),
    value: inDate,
    mode: 'date',
    onChange: setInDate,
  });
  const inTimeRow = useDateTimeRow(rt, {
    label: tr('lodgingEdit.checkinFrom'),
    value: inTime,
    mode: 'time',
    onChange: setInTime,
  });
  const outDateRow = useDateTimeRow(rt, {
    label: tr('common.checkout'),
    value: outDate,
    mode: 'date',
    onChange: setOutDate,
  });
  const outTimeRow = useDateTimeRow(rt, {
    label: tr('lodgingEdit.checkoutBy'),
    value: outTime,
    mode: 'time',
    onChange: setOutTime,
  });
  const media = useMediaUploads(rt, edits, sheet, 'lodging', itemId ?? '');

  if (!view || (itemId && !lodging)) return null;

  const checkIn = zonedToUtc({ date: inDate, time: inTime }, zone).iso;
  const checkOut = zonedToUtc({ date: outDate, time: outTime }, zone).iso;
  const reference = zone === view.timeZone ? null : view.timeZone;

  const save = async () => {
    if (!name.trim() || saving) return;
    if (Date.parse(checkOut) <= Date.parse(checkIn)) {
      Alert.alert(tr('common.checkTime'), tr('lodgingEdit.checkoutMustAfterCheckin'));
      return;
    }
    const parsedPrice = parsePrice(price);
    if (parsedPrice === undefined) {
      Alert.alert(tr('common.checkPrice'), tr('common.pleaseEnterNumberEG'));
      return;
    }
    const input: LodgingInput = {
      name: name.trim(),
      type,
      timezone: zone,
      check_in: checkIn,
      check_out: checkOut,
      reservation_number: reservation.trim() || null,
      price: parsedPrice,
      price_currency: currency,
      link: link.trim() || null,
      location: address.trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      description: description.trim() || null,
      rating: rating || null,
      is_public: isPublic,
    };
    setSaving(true);
    const saved = lodging
      ? await edits.saveLodging(lodging.id, { name: input.name, ...changedFields(lodging, input) })
      : await edits.saveLodging(null, input);
    setSaving(false);
    if (!saved) return;
    if (fromShare === '1')
      router.dismissTo({ pathname: '/share', params: { collectionId, objectId: saved.id, kind: 'lodging' } });
    else if (lodging) router.back();
    // A new lodging opens its detail screen, where photos and files can be added.
    else router.replace({ pathname: '/lodging/[collectionId]/[itemId]', params: { collectionId, itemId: saved.id } });
  };

  const searchAddress = () =>
    places.start(tr('lodgingEdit.searchAddress'), (p) => {
      setPlaceRevision((revision) => revision + 1);
      setAddress(p.address ?? p.name);
      if (!name.trim()) setName(p.name);
      setCoords({ latitude: p.latitude, longitude: p.longitude });
      const guess = suggestedZone(p.latitude, p.longitude) ?? nearestZone(view.collection, p.latitude, p.longitude);
      if (guess && guess !== zone) setZone(guess);
    });

  const confirmDelete = () =>
    lodging &&
    Alert.alert(
      tr('common.deleteNameConfirm', { name: lodging.name }),
      tr('common.includingPhotosAttachmentsPlanEntries'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('common.delete'),
          style: 'destructive',
          onPress: async () => {
            router.dismiss(2);
            await edits.deleteObject('lodging', lodging.id);
          },
        },
      ],
    );

  return (
    <>
      <Stack.Screen options={{ title: lodging ? tr('lodgingEdit.editStay') : tr('common.newStay') }} />
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
          <FieldGroup.Section title={tr('common.name')}>
            <TextInput
              testID="lodging-name"
              key={`name-${placeRevision}`}
              defaultValue={name}
              onChangeText={setName}
              placeholder={tr('lodgingEdit.eGHotelByStation')}
              {...initialFocus}
            />
            {typeSelect.row}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.address')}>
            <TextInput
              testID="lodging-address"
              key={`addr-${placeRevision}`}
              defaultValue={address}
              onChangeText={setAddress}
              placeholder={tr('common.address')}
              multiline
            />
            <ListItem colors={rt.listColors} leading={<RowIcon name="search" />} onPress={searchAddress}>
              {tr('lodgingEdit.searchAddress')}
            </ListItem>
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('lodgingEdit.stay')}>
            {zoneSelect.row}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: colors.secondary, fontSize: 13 }}>
                {tr('common.placeSearchSuggestsTimeZone')}
              </Text>
            </FieldGroup.SectionFooter>
            {inDateRow.row}
            {inTimeRow.row}
            {outDateRow.row}
            {outTimeRow.row}
            {reference ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                  {tr('lodgingEdit.inZoneCheckinInCheckout', {
                    zone: reference,
                    in: formatDateTime(checkIn, reference),
                    out: formatDateTime(checkOut, reference),
                  })}
                </Text>
              </FieldGroup.SectionFooter>
            ) : null}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.booking')}>
            <TextInput
              defaultValue={reservation}
              onChangeText={setReservation}
              placeholder={tr('common.bookingNumber')}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TextInput
              defaultValue={price}
              onChangeText={setPrice}
              placeholder={tr('common.price')}
              keyboardType="decimal-pad"
            />
            {currencySelect.row}
            <TextInput
              defaultValue={link}
              onChangeText={setLink}
              placeholder={tr('common.linkHttps')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.visibility')}>
            {publicRow(rt, isPublic, setIsPublic)}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.rating')}>{ratingSelect.row}</FieldGroup.Section>

          <FieldGroup.Section title={tr('common.notes')}>{markdown.row}</FieldGroup.Section>

          {lodging ? (
            <FieldGroup.Section title={tr('common.attachments')}>
              {attachmentEditRows(rt, lodging.attachments, sheet, prompt, edits)}
              {media.fileRows}
            </FieldGroup.Section>
          ) : null}

          {lodging ? (
            <FieldGroup.Section>
              <ListItem
                colors={{ ...rt.listColors, contentColor: colors.danger }}
                leading={<RowIcon name="delete" color={colors.danger} />}
                onPress={confirmDelete}>
                <Text textStyle={{ color: colors.danger }}>{tr('lodgingEdit.deleteStay')}</Text>
              </ListItem>
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </FormHost>
      {typeSelect.sheet}
      {zoneSelect.sheet}
      {currencySelect.sheet}
      {ratingSelect.sheet}
      {inDateRow.sheet}
      {inTimeRow.sheet}
      {outDateRow.sheet}
      {outTimeRow.sheet}
      {sheet.sheet}
      {prompt.sheet}
      {places.sheet}
    </>
  );
}
