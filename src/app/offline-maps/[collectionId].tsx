import { FieldGroup, ListItem } from '@expo/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { useCollectionView } from '@/data/queries';
import { mapData } from '@/data/selectors';
import { useOnline } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { deleteRegion, downloadRegion, downloadsSupported, resumeRegion, type SavedRegion } from '@/maps/offline';
import { planRegion } from '@/maps/regions';
import { useOfflineMaps } from '@/maps/useOfflineMaps';
import { formatBytes } from '@/offline/fileCache';
import { useSelect } from '@/ui/Select';
import { RowIcon, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

export default function OfflineMapsScreen() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const { view } = useCollectionView(collectionId);
  const { regions, loading, error } = useOfflineMaps(collectionId);
  const online = useOnline();
  const rt = useRowTheme();
  const [area, setArea] = useState('all');
  const [busy, setBusy] = useState(false);
  const points = useMemo(
    () => (view ? mapData(view).points.filter((p) => p.kind === 'location' || p.kind === 'lodging') : []),
    [view],
  );
  const options = [
    { value: 'all', label: tr('offlineMaps.entireTrip') },
    ...points.map((p) => ({ value: p.key, label: p.title })),
  ];
  const selected = area === 'all' ? points : points.filter((p) => p.key === area);
  const plan = planRegion(selected);
  const name = options.find((o) => o.value === area)?.label ?? tr('offlineMaps.entireTrip');
  const select = useSelect(rt, {
    title: tr('offlineMaps.mapArea'),
    label: tr('offlineMaps.mapArea'),
    value: area,
    options,
    onChange: setArea,
  });
  const supported = downloadsSupported();
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch {
      Alert.alert(tr('offlineMaps.mapNotSaved'), tr('offlineMaps.downloadFailedCheckConnectionTry'));
    } finally {
      setBusy(false);
    }
  };
  const remove = (region: SavedRegion) =>
    Alert.alert(tr('offlineMaps.deleteOfflineMapConfirm'), region.name, [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('common.delete'), style: 'destructive', onPress: () => void run(() => deleteRegion(region.pack.id)) },
    ]);
  const active = regions.some((r) => r.status.state === 'active');
  return (
    <>
      <Stack.Screen options={{ title: tr('common.offlineMaps') }} />
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          <FieldGroup.Section title={view?.collection.name ?? tr('common.map')}>
            {select.row}
            {plan ? (
              <ListItem
                colors={rt.listColors}
                supportingText={<Sub>{tr('offlineMaps.tilesZoom', { count: plan.tiles, zoom: plan.maxZoom })}</Sub>}
                leading={<RowIcon name="offline" />}
                onPress={
                  supported && online && !active && !busy
                    ? () => {
                        Alert.alert(
                          tr('offlineMaps.downloadMapConfirm'),
                          tr('offlineMaps.downloadRequiresInternetMayUse'),
                          [
                            { text: tr('common.cancel'), style: 'cancel' },
                            {
                              text: tr('offlineMaps.download'),
                              onPress: () => void run(() => downloadRegion(collectionId, name, plan)),
                            },
                          ],
                        );
                      }
                    : undefined
                }>
                {busy ? tr('common.loading') : tr('offlineMaps.downloadMap')}
              </ListItem>
            ) : (
              <Text>{tr('offlineMaps.noPlacesWithCoordinates')}</Text>
            )}
            <FieldGroup.SectionFooter>
              <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>
                {!supported
                  ? tr('offlineMaps.offlineMapsRequireNewApp')
                  : !online
                    ? tr('common.onlyWithInternet')
                    : tr('offlineMaps.entireTripSavedAsOverview')}
              </Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section title={tr('offlineMaps.savedMaps')}>
            {loading ? (
              <Text>{tr('common.loading')}</Text>
            ) : error ? (
              <Text>{tr('offlineMaps.couldNotReadSavedMaps')}</Text>
            ) : !regions.length ? (
              <Text>{tr('offlineMaps.noMapsDownloadedYet')}</Text>
            ) : null}
            {regions.flatMap((region) => {
              const { status } = region;
              return [
                <ListItem
                  key={region.pack.id}
                  colors={rt.listColors}
                  leading={<RowIcon name="map" />}
                  supportingText={
                    <Sub>
                      {region.error === 'area-limit'
                        ? tr('offlineMaps.areaTooLargeDeleteIt')
                        : region.error
                          ? tr('offlineMaps.downloadInterruptedTryAgain')
                          : status.state === 'complete'
                            ? tr('offlineMaps.availableOfflineSizeZoomLevel', {
                                size: formatBytes(status.completedResourceSize),
                                zoom: region.maxZoom,
                              })
                            : tr('offlineMaps.percentDownloadedSize', {
                                percent: Math.floor(status.percentage),
                                size: formatBytes(status.completedResourceSize),
                              })}
                    </Sub>
                  }>
                  {region.name}
                </ListItem>,
                ...(status.state !== 'complete' && region.error !== 'area-limit'
                  ? [
                      <ListItem
                        key={`${region.pack.id}-pause`}
                        colors={rt.listColors}
                        onPress={
                          !busy && (status.state === 'active' || (online && supported))
                            ? () =>
                                void run(() => (status.state === 'active' ? region.pack.pause() : resumeRegion(region)))
                            : undefined
                        }>
                        {status.state === 'active' ? tr('offlineMaps.pauseDownload') : tr('offlineMaps.resumeDownload')}
                      </ListItem>,
                    ]
                  : []),
                <ListItem
                  key={`${region.pack.id}-delete`}
                  colors={{ ...rt.listColors, contentColor: rt.colors.danger }}
                  onPress={!busy ? () => remove(region) : undefined}>
                  {tr('offlineMaps.deleteOfflineMap')}
                </ListItem>,
              ];
            })}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
      {select.sheet}
    </>
  );
}
