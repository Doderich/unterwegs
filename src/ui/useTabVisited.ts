import { useIsFocused } from 'expo-router';
import { useState } from 'react';

/**
 * Native tabs mount every tab together with the first one. Secondary tabs render once they are first opened and
 * stay mounted afterwards, so opening a collection only pays for "Heute".
 */
export function useTabVisited(): boolean {
  const focused = useIsFocused();
  const [visited, setVisited] = useState(focused);
  if (focused && !visited) setVisited(true);
  return visited || focused;
}
