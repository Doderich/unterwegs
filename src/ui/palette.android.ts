import { useMaterialColors } from '@expo/ui/jetpack-compose';

import { ACCENT_SEED, accent } from './accent';
import type { Palette } from './palette';

/**
 * Android: the Material 3 scheme Expo UI derives from the icon's teal (`seedColor`), the same algorithm Material You
 * uses for wallpapers, so it looks the same on every phone and Android version. "Mehr Kontrast" swaps in the
 * stronger outline and on-surface roles and the AAA teal.
 */
export function usePalette(isDark: boolean, highContrast: boolean): Palette {
  const m = useMaterialScheme(isDark);
  return {
    background: m.surface,
    card: m.surfaceContainerLow,
    text: m.onSurface,
    secondary: highContrast ? m.onSurface : m.onSurfaceVariant,
    border: highContrast ? m.outline : m.outlineVariant,
    tint: highContrast ? accent(isDark, true) : m.primary,
    danger: m.error,
  };
}

/** The app's Material scheme, also outside a Compose `Host` (which would otherwise fall back to the wallpaper). */
export function useMaterialScheme(isDark: boolean) {
  return useMaterialColors({ colorScheme: isDark ? 'dark' : 'light', seedColor: ACCENT_SEED });
}
