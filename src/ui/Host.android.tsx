import { Host as UIHost } from '@expo/ui';
import type { ComponentProps } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { ACCENT_SEED } from './accent';
import { useMaterialScheme } from './palette.android';

/** Widest a screen's forms and lists get; on tablets and unfolded foldables they are centred at this width. */
export const READABLE_WIDTH = 720;

/**
 * Compose hosts read the system night mode, not the app's appearance setting. When the two differ, Compose
 * picks the dark Material scheme and draws light grey text on our light cards (or the reverse). Pass the
 * scheme React Native resolved, so native text always matches `useColors()`.
 *
 * Full-screen hosts (no `matchContents`) are capped at `READABLE_WIDTH` and centred, so rows don't stretch
 * across a tablet; on phones the cap is wider than the screen and changes nothing.
 */
export function Host(props: ComponentProps<typeof UIHost>) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = useMaterialScheme(scheme === 'dark');
  // Every Compose subtree uses the app's teal scheme, not the wallpaper's.
  if (props.matchContents) return <UIHost colorScheme={scheme} seedColor={ACCENT_SEED} {...props} />;
  return (
    <View style={[styles.frame, { backgroundColor: palette.surface }]}>
      <UIHost colorScheme={scheme} seedColor={ACCENT_SEED} {...props} style={[styles.host, props.style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center' },
  host: { flex: 1, width: '100%', maxWidth: READABLE_WIDTH },
});
