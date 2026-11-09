import { Stack } from 'expo-router';
import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { tr } from '@/i18n';

import { toolbarIcon } from './icons';

/**
 * iPad search in a screen's header (DESIGN.md → iPad). In landscape there is room, so the field shows open in a group
 * of its own after + and the other actions. In portrait it is a magnifier with its own background, collapsed until
 * tapped. Tapping it opens the native search field in the header and focuses it; Cancel,
 * or leaving it empty, closes it again. The search bar's own collapsed button can't be used: iOS always merges it
 * into the same group as the other header buttons.
 *
 * `button` goes last in the screen's `Stack.Toolbar placement="right"`, `bar` anywhere in the screen.
 */
export function useHeaderSearch({
  placeholder,
  onChange,
  onActive,
}: {
  placeholder: string;
  onChange: (query: string) => void;
  /** The field is in use (focused or holding text), so the screen can show suggestions before anything is typed. */
  onActive?: (active: boolean) => void;
}): { button: ReactNode; bar: ReactNode } {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = useRef<ComponentRef<typeof Stack.SearchBar>>(null);
  const window = useWindowDimensions();
  const close = () => {
    setQuery('');
    onChange('');
    setOpen(false);
    onActive?.(false);
  };
  if (window.width > window.height)
    return {
      button: null,
      bar: (
        <Stack.SearchBar
          ref={search}
          placement="automatic"
          hideWhenScrolling={false}
          hideNavigationBar={false}
          obscureBackground={false}
          placeholder={placeholder}
          onChangeText={(event) => {
            setQuery(event.nativeEvent.text);
            onChange(event.nativeEvent.text);
          }}
          onFocus={() => onActive?.(true)}
          onBlur={() => {
            if (!query.trim()) onActive?.(false);
          }}
          onCancelButtonPress={() => {
            setQuery('');
            onChange('');
            onActive?.(false);
            search.current?.blur();
          }}
        />
      ),
    };
  return {
    button: open ? null : (
      <Stack.Toolbar.Button
        icon={toolbarIcon('search') as never}
        accessibilityLabel={tr('common.search')}
        separateBackground
        onPress={() => {
          setOpen(true);
          onActive?.(true);
        }}
      />
    ),
    bar: open ? (
      <Stack.SearchBar
        ref={search}
        placement="integrated"
        autoFocus
        hideWhenScrolling={false}
        hideNavigationBar={false}
        obscureBackground={false}
        placeholder={placeholder}
        onChangeText={(event) => {
          setQuery(event.nativeEvent.text);
          onChange(event.nativeEvent.text);
        }}
        onBlur={() => {
          if (!query.trim()) close();
        }}
        onCancelButtonPress={close}
      />
    ) : null,
  };
}
