import { useDescriptionRows } from '@/ui/useDescriptionRows';
import { FieldGroup, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { findItem, useCollectionView } from '@/data/queries';
import { missingCollection } from '@/ui/CollectionLoading';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { useActionSheet } from '@/ui/ActionSheet';
import { useMediaUploads } from '@/ui/media';
import { detailExtras } from '@/ui/resourceDetail';
import { lodgingLabel, androidToolbarIcon, toolbarIcon } from '@/ui/icons';
import { RowIcon, useCopy, useOpenAttachment, useRowTheme } from '@/ui/rows';
import { Host } from '@/ui/Host';
import { resourceHeaderRows } from '@/ui/ResourceHeader';
import { stayRows } from '@/ui/StaySummary';

/** Organised around arrival: the property, then check-in/out, address, booking number and site; the rest below. */
export default function LodgingScreen() {
  const { collectionId, itemId } = useLocalSearchParams<{ collectionId: string; itemId: string }>();
  const collection = useCollectionView(collectionId);
  const { view } = collection;
  const rt = useRowTheme();
  const edits = useCollectionEdits(view);
  const sheet = useActionSheet(rt);
  const media = useMediaUploads(rt, edits, sheet, 'lodging', itemId);
  const copier = useCopy();
  const opener = useOpenAttachment();
  const lodging = view ? findItem(view.collection, 'lodging', itemId) : undefined;
  const descriptionRows = useDescriptionRows(rt, lodging?.description);
  if (!view || !lodging) return missingCollection(collection, !!lodging);

  return (
    <>
      <Stack.Screen options={{ title: lodgingLabel(lodging.type) }} />
      {edits.canEdit ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={androidToolbarIcon('edit')}
            accessibilityLabel={tr('common.edit')}
            onPress={() =>
              router.push({ pathname: '/lodging-edit/[collectionId]', params: { collectionId, itemId: lodging.id } })
            }>
            {tr('common.edit')}
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Button
            icon={toolbarIcon('more') as never}
            accessibilityLabel={tr('media.photosAndFiles')}
            onPress={media.openActions}
          />
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
          </FieldGroup.Section>

          <FieldGroup.Section title={tr('common.arrival')}>
            {stayRows(rt, copier, lodging, view.timeZone)}
            {lodging.location?.trim() ? (
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="pin" />}
                onPress={() =>
                  router.push({
                    pathname: '/address-card/[collectionId]',
                    params: { collectionId, itemId: lodging.id },
                  })
                }>
                {tr('utilities.addressCard')}
              </ListItem>
            ) : null}
          </FieldGroup.Section>

          {detailExtras(rt, opener, {
            price: { amount: lodging.price, currency: lodging.price_currency },
            rating: lodging.rating,
            notes: lodging.description ? descriptionRows : null,
            attachments: lodging.attachments,
            attachmentTitle: tr('common.attachments'),
            fileRows: [],
          })}
        </FieldGroup>
      </Host>
      {sheet.sheet}
    </>
  );
}
