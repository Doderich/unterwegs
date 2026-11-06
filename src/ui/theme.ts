import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useSettings } from '@/settings/store';

import { usePalette, type Palette } from './palette';

export type Colors = Palette;

/**
 * The app's colours: platform colours from the Expo libraries (`palette.ts`: iOS system colours, `palette.android.ts`:
 * the Material 3 scheme seeded from the icon teal), with the teal accent.
 */
export function useColors(): Colors {
  const isDark = useColorScheme() === 'dark';
  const { highContrast } = useSettings();
  return usePalette(isDark, highContrast);
}

/** Native list rows: secondary color for the supporting (second) line, like system settings rows. */
export function useListColors() {
  const colors = useColors();
  return { supportingContentColor: colors.secondary };
}

/** "Bewegung reduzieren" in the app, or the system's reduce-motion setting. */
export function useReduceMotion(): boolean {
  const system = useReducedMotion();
  return useSettings().reduceMotion || system;
}
