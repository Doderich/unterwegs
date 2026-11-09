import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { tr } from '@/i18n';
import SearchScreen from '@/screens/SearchScreen';
import { useScreenSearch } from './ScreenSearch';
import { MainToolbar } from './MainToolbar';
import { useHeaderSearch } from './HeaderSearch';

/** iOS owns one native search controller per tab; Android keeps its in-list launcher. */
export function MainSearchScreen({ tab, children }: { tab: string; children: ReactNode }) {
  const [query, setQuery] = useState('');
  const search = useScreenSearch();
  const ipad = useHeaderSearch({ placeholder: tr('search.everything'), onChange: setQuery });
  if (Platform.OS !== 'ios') return children;
  // iPad: a magnifier apart from + and settings that opens the field in the header (useHeaderSearch).
  if (Platform.isPad)
    return (
      <>
        <MainToolbar tab={tab} search={ipad.button} />
        {ipad.bar}
        {query.trim() ? <SearchScreen embeddedQuery={query} /> : children}
      </>
    );
  return (
    <>
      <MainToolbar tab={tab} />
      <Stack.SearchBar
        ref={search}
        placement="stacked"
        hideWhenScrolling={false}
        hideNavigationBar={false}
        obscureBackground={false}
        placeholder={tr('search.everything')}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => {
          setQuery('');
          search.current?.blur();
        }}
      />
      {query.trim() ? <SearchScreen embeddedQuery={query} /> : children}
    </>
  );
}
