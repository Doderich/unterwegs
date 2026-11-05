import { Host as UIHost } from '@expo/ui';
import { useMaterialColors } from '@expo/ui/jetpack-compose';
import type { ComponentProps } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

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
  const palette = useMaterialColors({ colorScheme: scheme, seedColor: props.seedColor });
  if (props.matchContents) return <UIHost colorScheme={scheme} {...props} />;
  return (
    <View style={[styles.frame, { backgroundColor: palette.surface }]}>
      <UIHost colorScheme={scheme} {...props} style={[styles.host, props.style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center' },
  host: { flex: 1, width: '100%', maxWidth: READABLE_WIDTH },
});
