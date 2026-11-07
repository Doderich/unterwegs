import { BottomSheet, Column, ScrollView } from '@expo/ui';
import * as Location from 'expo-location';
import { useRef, useState, type ReactElement } from 'react';
import { Alert, Linking } from 'react-native';

import type { PlaceResult } from '@/api/schemas';
import { useClient } from '@/auth/session';
import { tr } from '@/i18n';

import { RowIcon, type RowTheme } from './rows';
import { Sub } from './Sub';
import { SheetRow } from './SheetRow';
import { Text } from './Text';
import { TextInput } from '@/ui/TextInput';

/** A picked place: name, full address and coordinates. */
export type PickedPlace = { name: string; address: string | null; latitude: number; longitude: number };

export function placeFromResult(r: PlaceResult): PickedPlace {
  const name = r.name || r.display_name?.split(',')[0]?.trim() || '';
  return { name, address: r.display_name ?? null, latitude: r.lat, longitude: r.lon };
}

/**
 * Search for a place (server-side Nominatim) or take the current position. Opens as a sheet; `onPick` gets the
 * result. Render `sheet` next to the screen's `Host`.
 */
export function usePlaceSearch(t: RowTheme, { withCurrentPosition = true }: { withCurrentPosition?: boolean } = {}) {
  const client = useClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const onPick = useRef<(p: PickedPlace) => void>(() => {});
  const query = useRef('');

  const start = (sheetTitle: string, pick: (p: PickedPlace) => void) => {
    onPick.current = pick;
    setTitle(sheetTitle);
    setResults(null);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const pick = (p: PickedPlace) => {
    close();
    onPick.current(p);
  };

  const search = async () => {
    const q = query.current.trim();
    if (q.length < 2) return;
    setBusy(true);
    try {
      setResults(await client.searchPlaces(q));
    } catch {
      setResults([]);
    } finally {
      setBusy(false);
    }
  };

  const currentPosition = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(tr('placeSearch.noAccessLocation'), tr('common.allowAccessInSettings'), [
        { text: tr('common.cancel'), style: 'cancel' },
        { text: tr('common.settings'), onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    setBusy(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      // Names only (no street address); a failure still leaves the coordinates.
      const geo = await client.reverseGeocode(latitude, longitude).catch(() => null);
      pick({
        name: geo?.location_name ?? '',
        address: [geo?.city, geo?.region, geo?.country].filter(Boolean).join(', ') || null,
        latitude,
        longitude,
      });
    } catch {
      Alert.alert(tr('placeSearch.locationNotFound'), tr('placeSearch.pleaseTryAgainOrSearch'));
    } finally {
      setBusy(false);
    }
  };

  const sheet: ReactElement = (
    <BottomSheet isPresented={open} onDismiss={close} snapPoints={['full']}>
      <ScrollView>
        <Column spacing={8} style={{ padding: 16 }}>
          <Text textStyle={{ fontSize: 20, fontWeight: '600', color: t.colors.text }}>{title}</Text>
          {open ? (
            <TextInput
              placeholder={tr('placeSearch.searchForPlaceAddressOr')}
              onChangeText={(v) => (query.current = v)}
              returnKeyType="search"
              onSubmitEditing={() => void search()}
              autoFocus
            />
          ) : null}
        </Column>
        <Column spacing={0}>
          <SheetRow
            testID="place-search-submit"
            colors={{ ...t.listColors, containerColor: 'transparent' }}
            leading={<RowIcon name="search" />}
            onPress={() => void search()}>
            {busy ? tr('placeSearch.searching') : tr('common.search')}
          </SheetRow>
          {withCurrentPosition ? (
            <SheetRow
              colors={{ ...t.listColors, containerColor: 'transparent' }}
              leading={<RowIcon name="myLocation" />}
              onPress={() => void currentPosition()}>
              {tr('placeSearch.currentLocation')}
            </SheetRow>
          ) : null}
          {results?.length === 0 ? (
            <Text textStyle={{ color: t.colors.secondary }} style={{ padding: 16 }}>
              {tr('placeSearch.nothingFound')}
            </Text>
          ) : null}
          {(results ?? []).map((r, i) => {
            const p = placeFromResult(r);
            return (
              <SheetRow
                key={`${r.lat},${r.lon},${i}`}
                testID={`place-result-${i}`}
                colors={{ ...t.listColors, containerColor: 'transparent' }}
                leading={<RowIcon name="location" />}
                supportingText={p.address ? <Sub>{p.address}</Sub> : undefined}
                onPress={() => pick(p)}>
                {p.name}
              </SheetRow>
            );
          })}
        </Column>
      </ScrollView>
    </BottomSheet>
  );

  return { start, sheet };
}
