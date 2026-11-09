import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';

import { useCollectionContext } from '@/data/CollectionContext';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { tr } from '@/i18n';
import { formatDayLabel } from '@/time/tz';
import { openLodging } from '@/ui/entries';
import { lodgingTypeLabel } from '@/ui/icons';
import { RowIcon } from '@/ui/rows';
import { useColors, useListColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';
import { nightsLabel } from '@/ui/StaySummary';
import { CollectionLoading } from '@/ui/CollectionLoading';
import { photoListItem, usePhotoColumns, photoSection } from '@/ui/PhotoListItem';
import { CollectionTabHeader } from '@/ui/CollectionTabStack';
import { RefreshableFieldGroup } from '@/ui/RefreshableFieldGroup';

function LodgingsScreen() {
  const photoColumns = usePhotoColumns();
  const listColors = useListColors();
  const { view } = useCollectionContext();
  const colors = useColors();
  const edits = useCollectionEdits(view);
  if (!view) return <CollectionLoading />;
  const collectionId = view.collection.id;
  const totalNights = view.lodgings.reduce((n, s) => n + s.nights, 0);

  return (
    <Host style={{ flex: 1 }}>
      <RefreshableFieldGroup>
        {photoSection(
          { key: 'photos-8' },
          <>
            {view.lodgings.map(({ lodging, nights, checkInDate, checkOutDate }) =>
              photoListItem({
                key: lodging.id,
                colors: listColors,
                images: lodging.images,
                icon: <RowIcon name="lodging" />,
                title: lodging.name,
                subtitle: [
                  checkInDate && checkOutDate
                    ? `${formatDayLabel(checkInDate)} – ${formatDayLabel(checkOutDate)}`
                    : null,
                  nights ? nightsLabel(nights) : null,
                  lodgingTypeLabel(lodging.type),
                  lodging.location,
                ]
                  .filter(Boolean)
                  .join(' · '),
                onPress: () => openLodging(view.collection.id, lodging.id),
              }),
            )}
            {view.lodgings.length === 0 ? (
              <Text textStyle={{ color: colors.secondary }}>{tr('stays.noAccommodationAdded')}</Text>
            ) : null}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ fontSize: 13, color: colors.secondary }}>
                {`${tr('common.stayCount', { count: view.lodgings.length })} · ${nightsLabel(totalNights)}`}
              </Text>
            </FieldGroup.SectionFooter>
          </>,
          photoColumns,
        )}
        {edits.canEdit ? (
          <FieldGroup.Section title={tr('common.new')}>
            <ListItem
              colors={listColors}
              leading={<RowIcon name="lodging" />}
              onPress={() => router.push({ pathname: '/lodging-edit/[collectionId]', params: { collectionId } })}>
              {tr('common.newStay')}
            </ListItem>
            <ListItem
              colors={listColors}
              leading={<RowIcon name="train" />}
              onPress={() => router.push({ pathname: '/transport-edit/[collectionId]', params: { collectionId } })}>
              {tr('common.newConnection')}
            </ListItem>
          </FieldGroup.Section>
        ) : null}
      </RefreshableFieldGroup>
    </Host>
  );
}

export default function LodgingsScreenTab() {
  return (
    <>
      <CollectionTabHeader />
      <LodgingsScreen />
    </>
  );
}
