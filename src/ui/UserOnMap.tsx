import { UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '@/i18n';

import { floatingShadow, useColors } from './theme';

type CameraHolder = { current: CameraRef | null };

/** Lets the locate button turn the dot on in the same moment access is granted, before the next permission read. */
const accessListeners = new Set<(granted: boolean) => void>();

function watchAccess(onChange: (granted: boolean) => void): () => void {
  accessListeners.add(onChange);
  return () => {
    accessListeners.delete(onChange);
  };
}

function publishAccess(granted: boolean) {
  for (const listener of accessListeners) listener(granted);
}

async function readAccess(): Promise<boolean> {
  const permission = await Location.getForegroundPermissionsAsync();
  return permission.granted;
}

/**
 * The position dot. Stays off until location access is allowed, so opening the map does not prompt.
 * Must be rendered inside the map.
 */
export function UserLocationMarker() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const read = () => {
      void readAccess().then(setGranted);
    };
    read();
    const access = watchAccess(setGranted);
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => {
      access();
      app.remove();
    };
  }, []);

  if (!granted) return null;
  return <UserLocation animated accuracy={false} minDisplacement={10} />;
}

/**
 * Asks for location access and moves the map there. The trip stays framed until this is pressed, and the map
 * does not follow afterwards. Hidden while a point's sheet is open.
 */
export function LocateButton({ camera, hidden }: { camera: CameraHolder; hidden?: boolean }) {
  const insets = useSafeAreaInsets();
  if (hidden) return null;

  const show = () => {
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(tr('placeSearch.noAccessLocation'), tr('common.allowAccessInSettings'), [
          { text: tr('common.cancel'), style: 'cancel' },
          { text: tr('common.settings'), onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      publishAccess(true);
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        camera.current?.easeTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 600,
        });
      } catch {
        Alert.alert(tr('map.locationUnavailable'));
      }
    })();
  };

  return (
    <MapFab
      label={tr('map.showMyLocation')}
      name={{ ios: 'location', android: 'my_location' }}
      bottom={insets.bottom + 72}
      onPress={show}
    />
  );
}

/** A round control floating over a map. `bottom` is its distance from the screen bottom. */
export function MapFab({
  label,
  name,
  bottom,
  onPress,
}: {
  label: string;
  name: SymbolViewProps['name'];
  bottom: number;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        floatingShadow,
        { backgroundColor: colors.card, opacity: pressed ? 0.6 : 1, bottom },
      ]}>
      <SymbolView name={name} tintColor={colors.tint} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
