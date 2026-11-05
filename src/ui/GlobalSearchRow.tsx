import { router } from 'expo-router';
import { Platform } from 'react-native';

import { tr } from '@/i18n';
import { CardRow } from './CardRow';
import { SearchLauncher } from './MaterialSearch';

/** App-wide search entry inside the Android main screens' scrolling lists. */
export function GlobalSearchRow() {
  if (Platform.OS !== 'android') return null;
  return (
    <CardRow>
      <SearchLauncher placeholder={tr('search.everything')} onPress={() => router.push('/search')} />
    </CardRow>
  );
}
