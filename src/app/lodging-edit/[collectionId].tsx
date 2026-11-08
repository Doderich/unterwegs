import { FieldGroup, ListItem } from '@expo/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { LodgingInput } from '@/api/client';
import { findItem, useCollectionView } from '@/data/queries';
import { zoneOn } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { confirmDeleteFromEditor, leaveAfterSave } from '@/ui/editorExit';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { useMarkdownEditor } from '@/ui/MarkdownEditor';
import { useInitialInputFocus } from '@/ui/useInitialInputFocus';
import { suggestionZones } from '@/time/suggestionZones';
import { deviceTimeZone, formatDateTime } from '@/time/tz';
import { endsAfterStart, utcToZoned } from '@/time/zonedInput';
import { useActionSheet } from '@/ui/ActionSheet';
import { useZoneSelect } from '@/ui/DateTimeRow';
import { defaultCurrency, nextDate, parsePrice, ratingStars } from '@/ui/forms';
import { androidToolbarIcon, lodgingTypeLabel } from '@/ui/icons';
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
  const lodging = view ? findItem(view.collection, 'lodging', itemId) : undefined;

  const init = (() => {
    const zone = lodging?.timezone ?? (view ? zoneOn(view, day) : 'UTC');
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
  const inMoment = useZonedMoment(rt, {
    initial: init.checkIn,
    zone,
    dateLabel: tr('common.checkin'),
    timeLabel: tr('lodgingEdit.checkinFrom'),
  });
  const outMoment = useZonedMoment(rt, {
    initial: init.checkOut,
    zone,
    dateLabel: tr('common.checkout'),
    timeLabel: tr('lodgingEdit.checkoutBy'),
  });
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
    suggestions: view ? suggestionZones(view.timeZone, view.collection, deviceTimeZone()) : [],
    at: `${inMoment.date}T12:00:00Z`,
    onChange: setZone,
  });
  const currencySelect = useCurrencySelect(rt, currency, setCurrency);
  const ratingSelect = useRatingSelect(rt, rating, setRating);
  const media = useMediaUploads(rt, edits, sheet, 'lodging', itemId ?? '');

  if (!view || (itemId && !lodging)) return null;

  const checkIn = inMoment.iso;
  const checkOut = outMoment.iso;
  const reference = zone === view.timeZone ? null : view.timeZone;

  const save = async () => {
    if (!name.trim() || saving) return;
    if (!endsAfterStart(checkIn, checkOut)) {
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
    const saved = await edits.saveLodging(lodging ? lodging.id : null, input);
    setSaving(false);
    if (!saved) return;
    leaveAfterSave('lodging', { collectionId, savedId: saved.id, created: !lodging, fromShare: fromShare === '1' });
  };

  const searchAddress = () =>
    places.start(tr('lodgingEdit.searchAddress'), (p) => {
      const picked = fieldsFromPick(p, view.collection);
      setPlaceRevision((revision) => revision + 1);
      setAddress(picked.address ?? picked.name);
      if (!name.trim()) setName(picked.name);
      setCoords({ latitude: picked.latitude, longitude: picked.longitude });
      if (picked.zone && picked.zone !== zone) setZone(picked.zone);
    });

  const confirmDelete = () =>
    lodging &&
    confirmDeleteFromEditor({
      name: lodging.name,
      consequence: tr('common.includingPhotosAttachmentsPlanEntries'),
      onDelete: () => edits.deleteObject('lodging', lodging.id),
    });

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
            {inMoment.rows}
            {outMoment.rows}
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
            {priceLinkFields({
              leading: (
                <TextInput
                  defaultValue={reservation}
                  onChangeText={setReservation}
                  placeholder={tr('common.bookingNumber')}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              ),
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
            attachments: lodging ? lodging.attachments : null,
            attachmentTitle: tr('common.attachments'),
            sheet,
            prompt,
            edits,
            fileRows: media.fileRows,
            deleteLabel: tr('lodgingEdit.deleteStay'),
            onDelete: lodging ? confirmDelete : undefined,
          })}
        </FieldGroup>
      </FormHost>
      {typeSelect.sheet}
      {zoneSelect.sheet}
      {currencySelect.sheet}
      {ratingSelect.sheet}
      {inMoment.sheets}
      {outMoment.sheets}
      {sheet.sheet}
      {prompt.sheet}
      {places.sheet}
    </>
  );
}
