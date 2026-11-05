import { useDescriptionRows } from '@/ui/useDescriptionRows';
import { FieldGroup } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { useCollectionView } from '@/data/queries';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { useActionSheet } from '@/ui/ActionSheet';
import { useMediaUploads } from '@/ui/media';
import { formatPrice } from '@/ui/format';
import { starsLabel } from '@/ui/forms';
import { lodgingLabel, androidToolbarIcon } from '@/ui/icons';
import { attachmentRows, infoRow, useCopy, useOpenAttachment, useRowTheme } from '@/ui/rows';
import { Host } from '@/ui/Host';
import { resourceHeaderRows } from '@/ui/ResourceHeader';
import { stayRows } from '@/ui/StaySummary';

/** Organised around arrival: the property, then check-in/out, address, booking number and site; the rest below. */
export default function LodgingScreen() {
  const { collectionId, itemId } = useLocalSearchParams<{ collectionId: string; itemId: string }>();
  const { view } = useCollectionView(collectionId);
  const rt = useRowTheme();
  const edits = useCollectionEdits(view);
  const sheet = useActionSheet(rt);
  const media = useMediaUploads(rt, edits, sheet, 'lodging', itemId);
  const copier = useCopy();
  const opener = useOpenAttachment();
  const lodging = view?.collection.lodging.find((l) => l.id === itemId);
  const descriptionRows = useDescriptionRows(rt, lodging?.description);
  if (!view || !lodging) return null;

  const price = formatPrice(lodging.price, lodging.price_currency);
  const stars = starsLabel(lodging.rating);

  return (
    <>
      <Stack.Screen options={{ title: lodgingLabel(lodging.type) }} />
      {edits.online ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('edit')}
            accessibilityLabel={tr('common.edit')}
            onPress={() =>
              router.push({ pathname: '/lodging-edit/[collectionId]', params: { collectionId, itemId: lodging.id } })
            }>
            {tr('common.edit')}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section>
            {resourceHeaderRows(rt, {
              images: lodging.images,
              title: lodging.name,
              subtitle: lodgingLabel(lodging.type),
              icon: 'lodging',
              collectionId,
            })}
            {media.photoRows}
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.arrival')}>
            {stayRows(rt, copier, lodging, view.timeZone)}
          </FieldGroup.Section>

          {price || stars ? (
            <FieldGroup.Section title={tr('common.details')}>
              {stars ? infoRow(rt, { icon: 'star', label: tr('common.rating'), value: stars }) : null}
              {price ? infoRow(rt, { icon: 'price', label: tr('common.price'), value: price }) : null}
            </FieldGroup.Section>
          ) : null}

          {lodging.description ? (
            <FieldGroup.Section title={tr('common.notes')}>{descriptionRows}</FieldGroup.Section>
          ) : null}

          {lodging.attachments.length > 0 || media.fileRows.length > 0 ? (
            <FieldGroup.Section title={tr('common.attachments')}>
              {attachmentRows(rt, lodging.attachments, opener)}
              {media.fileRows}
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
      {sheet.sheet}
    </>
  );
}
