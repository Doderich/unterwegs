import { useDescriptionRows } from '@/ui/useDescriptionRows';
import { FieldGroup } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { useActionSheet } from '@/ui/ActionSheet';
import { useMediaUploads } from '@/ui/media';
import { transportTitle } from '@/ui/entries';
import { formatPrice } from '@/ui/format';
import { starsLabel } from '@/ui/forms';
import { transportIcon, transportLabel, androidToolbarIcon } from '@/ui/icons';
import {
  attachmentRows,
  copyRow,
  infoRow,
  linkRows,
  mapsRow,
  useCopy,
  useOpenAttachment,
  useRowTheme,
} from '@/ui/rows';
import { Host } from '@/ui/Host';
import { journeyRows } from '@/ui/JourneySummary';
import { resourceHeaderRows } from '@/ui/ResourceHeader';

/** Organised around the journey: departure and arrival in their own zones first, booking and the rest below. */
export default function TransportScreen() {
  const { collectionId, itemId } = useLocalSearchParams<{ collectionId: string; itemId: string }>();
  const { view } = useCollectionView(collectionId);
  const rt = useRowTheme();
  const edits = useCollectionEdits(view);
  const sheet = useActionSheet(rt);
  const media = useMediaUploads(rt, edits, sheet, 'transportation', itemId);
  const copier = useCopy();
  const opener = useOpenAttachment();
  const t = view?.collection.transportations.find((x) => x.id === itemId);
  const descriptionRows = useDescriptionRows(rt, t?.description);
  if (!view || !t) return null;

  const price = formatPrice(t.price, t.price_currency);
  const stars = starsLabel(t.rating);
  const typeLabel = transportLabel(t.type);

  return (
    <>
      <Stack.Screen options={{ title: typeLabel }} />
      {edits.online ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('edit')}
            accessibilityLabel={tr('common.edit')}
            onPress={() =>
              router.push({ pathname: '/transport-edit/[collectionId]', params: { collectionId, itemId: t.id } })
            }>
            {tr('common.edit')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {resourceHeaderRows(rt, {
              images: t.images,
              // The route is the journey below; the header names the service.
              title: [typeLabel, t.flight_number].filter(Boolean).join(' '),
              subtitle: t.name && t.name !== transportTitle(t) ? t.name : null,
              icon: transportIcon(t.type),
              collectionId,
              // Photos stay compact here: the journey is the focus.
              ratio: 2,
              compact: true,
            })}
            {media.photoRows}
          </FieldGroup.Section>

          <FieldGroup.Section>{journeyRows(rt, t, view.timeZone)}</FieldGroup.Section>

          <FieldGroup.Section>
            {t.from_location
              ? mapsRow(rt, {
                  key: 'from',
                  label: t.from_location,
                  address: [t.from_location, t.start_code && `(${t.start_code})`].filter(Boolean).join(' '),
                  latitude: t.origin_latitude,
                  longitude: t.origin_longitude,
                })
              : null}
            {t.to_location
              ? mapsRow(rt, {
                  key: 'to',
                  label: t.to_location,
                  address: [t.to_location, t.end_code && `(${t.end_code})`].filter(Boolean).join(' '),
                  latitude: t.destination_latitude,
                  longitude: t.destination_longitude,
                })
              : null}
            {t.flight_number
              ? copyRow(rt, copier, {
                  label: t.type === 'plane' ? tr('transport.flightNumber') : tr('transport.number'),
                  value: t.flight_number,
                })
              : null}
            {t.link ? linkRows(rt, { label: tr('transport.bookingWebsite'), url: t.link }) : null}
          </FieldGroup.Section>

          {price || stars ? (
            <FieldGroup.Section title={tr('common.details')}>
              {stars ? infoRow(rt, { icon: 'star', label: tr('common.rating'), value: stars }) : null}
              {price ? infoRow(rt, { icon: 'price', label: tr('common.price'), value: price }) : null}
            </FieldGroup.Section>
          ) : null}

          {t.description ? <FieldGroup.Section title={tr('common.notes')}>{descriptionRows}</FieldGroup.Section> : null}

          {t.attachments.length > 0 || media.fileRows.length > 0 ? (
            <FieldGroup.Section title={tr('common.ticketsAttachments')}>
              {attachmentRows(rt, t.attachments, opener)}
              {media.fileRows}
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
      {sheet.sheet}
    </>
  );
}
