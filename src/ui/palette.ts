import { Color } from 'expo-router';
import type { ColorValue } from 'react-native';

import { accent } from './accent';

export type Palette = {
  background: string;
  card: string;
  text: string;
  secondary: string;
  border: string;
  tint: string;
  danger: string;
};

/**
 * A `PlatformColor` typed as a string. The colours reach React Native styles and Expo UI's SwiftUI modifiers, which
 * both resolve platform colours, but Expo UI's universal `textStyle.color` and several of our props are typed `string`.
 * Don't do string work on these values (alpha suffixes, parsing): on iOS they are objects.
 */
const system = (color: ColorValue) => color as unknown as string;

/**
 * iOS: Apple's system colours (Expo Router `Color.ios`), so text, lines and grouped surfaces follow light/dark and
 * the system "Increase Contrast" setting by themselves. The accent is the icon's teal; iOS has no seeded palette.
 */
export function usePalette(isDark: boolean, highContrast: boolean): Palette {
  return {
    background: system(Color.ios.systemGroupedBackground),
    card: system(Color.ios.secondarySystemGroupedBackground),
    text: system(Color.ios.label),
    secondary: system(Color.ios.secondaryLabel),
    border: system(Color.ios.opaqueSeparator),
    tint: accent(isDark, highContrast),
    danger: system(Color.ios.systemRed),
  };
}
