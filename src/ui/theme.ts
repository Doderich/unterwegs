import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useSettings } from '@/settings/store';

const light = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  secondary: '#6C6C70',
  border: '#C6C6C8',
  tint: '#C2410C',
  danger: '#D70015',
};

const dark: typeof light = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  secondary: '#98989F',
  border: '#38383A',
  tint: '#FB923C',
  danger: '#FF6961',
};

/** "Mehr Kontrast": darker / lighter secondary text, accents and separators (WCAG AAA on the cards). */
const lightContrast: typeof light = {
  ...light,
  secondary: '#3A3A3C',
  border: '#8E8E93',
  tint: '#9A3412',
  danger: '#A50011',
};

const darkContrast: typeof light = {
  ...dark,
  secondary: '#D1D1D6',
  border: '#636366',
  tint: '#FDBA74',
  danger: '#FF9F99',
};

export type Colors = typeof light;

export function useColors(): Colors {
  const isDark = useColorScheme() === 'dark';
  const { highContrast } = useSettings();
  if (highContrast) return isDark ? darkContrast : lightContrast;
  return isDark ? dark : light;
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
