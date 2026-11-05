import { Stack, useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, type ComponentRef, type ReactNode } from 'react';

type FocusSearch = () => void;
type SearchActions = {
  register: (focus: FocusSearch) => () => void;
  focus: () => void;
};
const ScreenSearchContext = createContext<SearchActions | null>(null);

/** The detached native search action focuses the current tab's own search controller. */
export function ScreenSearchProvider({ children }: { children: ReactNode }) {
  const current = useRef<FocusSearch | null>(null);
  const actions = useMemo<SearchActions>(
    () => ({
      register(focus) {
        current.current = focus;
        return () => {
          if (current.current === focus) current.current = null;
        };
      },
      focus() {
        current.current?.();
      },
    }),
    [],
  );
  return <ScreenSearchContext value={actions}>{children}</ScreenSearchContext>;
}

export function useScreenSearchActions() {
  return useContext(ScreenSearchContext);
}

export function useScreenSearch() {
  const search = useRef<ComponentRef<typeof Stack.SearchBar>>(null);
  const actions = useScreenSearchActions();
  useFocusEffect(useCallback(() => actions?.register(() => search.current?.focus()), [actions]));
  return search;
}
