import { useColorScheme } from 'react-native';

import { useMaterialScheme } from './palette.android';

/** Match the native Material list before Compose or any data has mounted. */
export function useScreenBackground(): string {
  return useMaterialScheme(useColorScheme() === 'dark').surface;
}
