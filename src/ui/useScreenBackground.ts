import { useColors } from './theme';

export function useScreenBackground(): string {
  return useColors().background;
}
