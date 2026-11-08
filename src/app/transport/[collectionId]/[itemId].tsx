import { useDescriptionRows } from '@/ui/useDescriptionRows';
import { Button, FieldGroup } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { findItem, useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { TRAVEL_TAIL } from '@/glances/compute';
import { pinnedTravel, pinTravel } from '@/glances/pinnedTravel';
import { tr } from '@/i18n';
import { useActionSheet } from '@/ui/ActionSheet';
import { useMediaUploads } from '@/ui/media';
import { transportTitle } from '@/data/transportName';
import { detailExtras } from '@/ui/resourceDetail';
import { transportIcon, transportLabel, androidToolbarIcon } from '@/ui/icons';
import {
  copyRow,
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
  const t = view ? findItem(view.collection, 'transportation', itemId) : undefined;
  const descriptionRows = useDescriptionRows(rt, t?.description);
  const [pinned, setPinned] = useState(() => pinnedTravel());
  // When the screen opened: enough to decide whether the journey is still ahead.
  const [openedAt] = useState(() => Date.now());
  if (!view || !t) return null;

  // iOS Live Activity: until half an hour after arrival (docs/GLANCES.md).
  const endsAt = t.end_date || t.date ? Date.parse((t.end_date ?? t.date)!) + TRAVEL_TAIL : 0;
  const canPin = Platform.OS === 'ios' && !!t.date && openedAt < endsAt;
  const togglePin = () => {
    const next = pinned === t.id ? null : t.id;
    pinTravel(next);
    setPinned(next);
  };

  const typeLabel = transportLabel(t.type);

  return (
    <>
      <Stack.Screen options={{ title: typeLabel }} />
      {edits.canEdit ? (
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
            })}
            {media.photoRows}
          </FieldGroup.Section>

          <FieldGroup.Section>
            {journeyRows(rt, t, view.timeZone)}
            {canPin ? (
              <Button
                label={pinned === t.id ? tr('transport.hideFromLockScreen') : tr('transport.showOnLockScreen')}
                variant="text"
                onPress={togglePin}
              />
            ) : null}
          </FieldGroup.Section>

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

          {detailExtras(rt, opener, {
            price: { amount: t.price, currency: t.price_currency },
            rating: t.rating,
            notes: t.description ? descriptionRows : null,
            attachments: t.attachments,
            attachmentTitle: tr('common.ticketsAttachments'),
            fileRows: media.fileRows,
          })}
        </FieldGroup>
      </Host>
      {sheet.sheet}
    </>
  );
}
