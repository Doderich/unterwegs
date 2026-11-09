import { Button, FieldGroup } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { findItem, useCollectionView } from '@/data/queries';
import { viewToday } from '@/data/selectors';
import { tr } from '@/i18n';
import { missingCollection } from '@/ui/CollectionLoading';
import { Host } from '@/ui/Host';
import { useSelect } from '@/ui/Select';
import { useCopy, useRowTheme, mapsRow } from '@/ui/rows';
import { Text } from '@/ui/Text';
import { typeScale } from '@/ui/typeScale';
import { addressLodgings } from '@/utilities/address';

export default function AddressCardScreen() {
  const { collectionId, itemId, day } = useLocalSearchParams<{ collectionId: string; itemId?: string; day?: string }>();
  const query = useCollectionView(collectionId);
  const { view } = query;
  const rt = useRowTheme();
  const copy = useCopy();
  const [choice, setChoice] = useState('');
  const date = day ?? (view ? viewToday(view).date : '');
  const candidates = view ? addressLodgings(view, date) : [];
  const lodging = view
    ? itemId
      ? findItem(view.collection, 'lodging', itemId)
      : (candidates.find((l) => l.id === choice) ?? (candidates.length === 1 ? candidates[0] : undefined))
    : undefined;
  const select = useSelect(rt, {
    title: tr('utilities.chooseLodging'),
    label: tr('utilities.chooseLodging'),
    value: lodging?.id ?? '',
    options: [
      { value: '', label: tr('utilities.chooseLodging') },
      ...candidates.map((l) => ({ value: l.id, label: l.name })),
    ],
    onChange: setChoice,
  });
  if (!view || (itemId && !lodging)) return missingCollection(query, !!lodging);
  const text = lodging ? [lodging.name, lodging.location].filter(Boolean).join('\n') : '';
  return (
    <>
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          {!itemId && candidates.length !== 1 ? (
            <FieldGroup.Section title={date}>
              {candidates.length > 1 ? select.row : null}
              {!candidates.length ? <Text>{tr('utilities.noNightLodging')}</Text> : null}
            </FieldGroup.Section>
          ) : null}
          {lodging ? (
            <FieldGroup.Section title={itemId ? undefined : date}>
              <Text textStyle={{ ...typeScale.title, color: rt.colors.text }}>{lodging.name}</Text>
              <Text textStyle={{ ...typeScale.figure, color: rt.colors.text }}>
                {lodging.location?.trim() || tr('utilities.noAddress')}
              </Text>
              {lodging.location?.trim() ? (
                <>
                  <Button
                    variant="text"
                    label={copy.copied === text ? tr('rows.copied') : tr('utilities.copyAddress')}
                    onPress={() => void copy.copy(text)}
                  />
                  {mapsRow(rt, {
                    label: lodging.name,
                    address: lodging.location,
                    latitude: lodging.latitude,
                    longitude: lodging.longitude,
                  })}
                </>
              ) : (
                <Button
                  variant="text"
                  label={tr('utilities.openLodging')}
                  onPress={() =>
                    router.push({
                      pathname: '/lodging/[collectionId]/[itemId]',
                      params: { collectionId, itemId: lodging.id },
                    })
                  }
                />
              )}
            </FieldGroup.Section>
          ) : null}
        </FieldGroup>
      </Host>
      {select.sheet}
    </>
  );
}
