import { useState } from 'react';

/** A lazy native form can recycle the field; it must not take focus again when scrolled back into view. */
export function useInitialInputFocus(enabled: boolean) {
  const [hasFocused, setHasFocused] = useState(false);
  return { autoFocus: enabled && !hasFocused, onFocus: () => setHasFocused(true) };
}
