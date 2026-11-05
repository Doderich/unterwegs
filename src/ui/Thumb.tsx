import { RNHostView } from '@expo/ui';
import { Platform, StyleSheet, View } from 'react-native';

import { AuthImage } from './AuthImage';
import { useColors } from './theme';

/** Side of the square list thumbnail (decided in #10): itinerary, lists, map preview and search use the same crop. */
export const THUMB_SIZE = 56;

/**
 * Square photo for the leading slot of a native list row. The frame and a muted fill are there before the photo
 * loads and stay when it can't (offline without a copy, deleted on the server), so rows never jump.
 * iOS' ListItem hosts React Native accessories itself; Android's Compose ListItem needs the RNHostView wrapper.
 */
export function Thumb({ url, size = THUMB_SIZE }: { url: string; size?: number }) {
  const colors = useColors();
  const view = (
    <View
      style={[styles.frame, { width: size, height: size, borderRadius: size / 6, backgroundColor: colors.border }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <AuthImage url={url} style={styles.image} />
    </View>
  );
  return Platform.OS === 'android' ? <RNHostView matchContents>{view}</RNHostView> : view;
}

const styles = StyleSheet.create({ frame: { overflow: 'hidden' }, image: { width: '100%', height: '100%' } });
