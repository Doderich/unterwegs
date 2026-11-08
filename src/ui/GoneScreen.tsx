import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { tr } from '@/i18n';

import { ScaledText } from './ScaledText';
import { useColors } from './theme';
import { typeScale } from './typeScale';

/**
 * A collection or an item inside it is gone (HTTP 404). Same full page on every tab. Retrying cannot bring it
 * back, so the only action is leaving.
 */
export function GoneScreen({ kind }: { kind: 'collection' | 'item' }) {
  const colors = useColors();
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
      <View style={styles.group}>
        <View style={styles.mark}>
          <SymbolView
            name={
              kind === 'collection'
                ? { ios: 'map', android: 'map' }
                : { ios: 'mappin.slash', android: 'location_off' }
            }
            tintColor={colors.tint}
            size={48}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
        <ScaledText style={{ ...typeScale.title, ...styles.title, color: colors.text }}>
          {tr('goneScreen.title')}
        </ScaledText>
        <ScaledText style={{ ...typeScale.body, ...styles.body, color: colors.secondary }}>
          {kind === 'collection' ? tr('goneScreen.collection') : tr('goneScreen.item')}
        </ScaledText>
        <Pressable
          accessibilityRole="button"
          onPress={leave}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.wash, opacity: pressed ? 0.6 : 1 },
          ]}>
          <ScaledText style={{ ...typeScale.bodyStrong, color: colors.tint }}>{tr('errorScreen.back')}</ScaledText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 28 },
  group: { alignItems: 'center', maxWidth: 250 },
  mark: { marginBottom: 16 },
  title: { textAlign: 'center', lineHeight: 28, marginBottom: 6 },
  body: { textAlign: 'center', lineHeight: 22 },
  button: {
    alignSelf: 'stretch',
    marginTop: 28,
    minHeight: 44,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
