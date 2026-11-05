/**
 * The app accent: the teal of the icon's hills, darkened or lightened until it reads as text on the cards
 * (≥ 4.5:1; "Mehr Kontrast" ≥ 7:1). Android derives its whole Material scheme from `ACCENT_SEED`.
 */
export const ACCENT_SEED = '#428E8B';

const ACCENTS = {
  light: '#2F7672',
  dark: '#5FB3AE',
  lightContrast: '#1D5C59',
  darkContrast: '#8FD3CD',
};

export function accent(isDark: boolean, highContrast: boolean): string {
  if (highContrast) return isDark ? ACCENTS.darkContrast : ACCENTS.lightContrast;
  return isDark ? ACCENTS.dark : ACCENTS.light;
}
