import { router, type ErrorBoundaryProps } from 'expo-router';
// Plain React Native views on purpose: this screen must render even when the app's own UI layers (Host, the
// @expo/ui rows) are what failed. RN text scales with the system text size.
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { requestErrorText } from '@/api/errors';
import { tr } from '@/i18n';

import { useColors } from './theme';

/**
 * Shown instead of a screen that crashed while rendering, e.g. on data from a server version the app doesn't know.
 * The cached data is untouched; "Try again" renders the screen anew, "Back" leaves it.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const dark = useColorScheme() === 'dark';
  const colors = useColors();
  let canGoBack = false;
  try {
    canGoBack = router.canGoBack();
  } catch {
    // Outside the navigator (the root layout itself failed).
  }
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} accessibilityRole="alert">
      <Text style={[styles.title, { color: colors.text }]}>{tr('errorScreen.title')}</Text>
      <Text style={[styles.body, { color: colors.secondary }]}>{tr('errorScreen.body')}</Text>
      <Text style={[styles.detail, { color: colors.secondary }]} selectable>
        {error.name === 'SchemaError' ? requestErrorText(error) : error.message}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={[styles.button, { backgroundColor: colors.tint }]}>
        <Text style={[styles.buttonText, { color: dark ? '#000' : '#fff' }]}>{tr('common.tryAgain')}</Text>
      </Pressable>
      {canGoBack ? (
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.link}>
          <Text style={[styles.linkText, { color: colors.tint }]}>{tr('errorScreen.back')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 17, textAlign: 'center' },
  detail: { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  button: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, minHeight: 44 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  link: { padding: 12, minHeight: 44 },
  linkText: { fontSize: 17 },
});
