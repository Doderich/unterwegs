import { useMaterialColors } from '@expo/ui/jetpack-compose';

/** Match the native Material list before Compose or any data has mounted. */
export function useScreenBackground(): string {
  return useMaterialColors().surface;
}
