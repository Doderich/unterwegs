import { BottomSheet } from '@expo/ui';
import { Camera } from '@maplibre/maplibre-react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapCanvas } from '@/ui/MapCanvas';
import { floatingShadow } from '@/ui/theme';
import { useScreenBackground } from '@/ui/useScreenBackground';

/**
 * The floating shell both maps share: the map sits under the iOS navigation bar, the card clears that bar, and a
 * tapped point opens the same sheet. Paint, which points are framed, and what the card says stay with the caller.
 * `topReserve` is how tall that card is, so the camera keeps it off the points.
 */
export function MapFrame({
  bounds,
  topReserve,
  mapStyle,
  top,
  topStyle,
  presented,
  onDismiss,
  sheet,
  extra,
  children,
}: {
  bounds: [number, number, number, number] | null;
  topReserve: number;
  mapStyle: string;
  top: ReactNode;
  topStyle?: StyleProp<ViewStyle>;
  presented: boolean;
  onDismiss: () => void;
  sheet: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const backgroundColor = useScreenBackground();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // iOS draws the map under the translucent navigation bar; Android lays the content out below it.
  const headerOffset = Platform.OS === 'ios' ? headerHeight + 12 : 12;
  const padding = { top: headerOffset + topReserve, bottom: 100 + insets.bottom, left: 40, right: 40 };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <MapCanvas style={StyleSheet.absoluteFill} mapStyle={mapStyle} logo={false} compass>
        <Camera
          {...(bounds ? { bounds, padding, duration: 600, easing: 'ease' as const } : {})}
          initialViewState={bounds ? { bounds, padding } : undefined}
        />
        {children}
      </MapCanvas>
      <View style={[styles.card, { top: headerOffset }, topStyle]}>{top}</View>
      <BottomSheet
        isPresented={presented}
        onDismiss={onDismiss}
        contentPadding={{ top: 20, bottom: 16, left: 16, right: 16 }}>
        {sheet}
      </BottomSheet>
      {extra}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...floatingShadow,
  },
});
