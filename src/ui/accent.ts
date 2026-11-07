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

/**
 * The second accent: apricot, from the icon's sky, for time and "what's next" (countdowns, the next departure, how
 * long until it). Teal stays the colour of actions. Light mode uses a deep amber so it reads as text on white
 * (5:1; "Mehr Kontrast" 7:1); dark mode the icon's own apricot.
 */
const NEXT = {
  light: '#B45309',
  dark: '#FDBA74',
  lightContrast: '#92400E',
  darkContrast: '#FED7AA',
};

export function nextAccent(isDark: boolean, highContrast: boolean): string {
  if (highContrast) return isDark ? NEXT.darkContrast : NEXT.lightContrast;
  return isDark ? NEXT.dark : NEXT.light;
}

/** A quiet teal wash for the one card that leads a screen ("Als Nächstes"); text on it keeps full contrast. */
export function accentWash(isDark: boolean): string {
  return isDark ? '#15302E' : '#E4F1EF';
}

export function accent(isDark: boolean, highContrast: boolean): string {
  if (highContrast) return isDark ? ACCENTS.darkContrast : ACCENTS.lightContrast;
  return isDark ? ACCENTS.dark : ACCENTS.light;
}
