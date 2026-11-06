import { useColorScheme } from 'react-native';

import { useMaterialScheme } from './palette.android';

/** Material 3 navigation bar roles from the teal-seeded scheme, so the bar isn't the default lavender. */
export function useTabBarColors() {
  const m = useMaterialScheme(useColorScheme() === 'dark');
  return { backgroundColor: m.surfaceContainer, indicatorColor: m.secondaryContainer, rippleColor: m.secondaryContainer };
}
