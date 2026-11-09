import { Stack } from 'expo-router';

import { androidHeaderTitleSize } from '@/settings/apply';
import { useSettings } from '@/settings/store';

import { CollectionHeader, useCollectionChrome } from './CollectionHeader';
import { useScreenBackground } from './useScreenBackground';

/**
 * The stack inside each collection tab. On a regular-width iPad it shows the collection's header, so the tab bar
 * sits in the header row like Home's (docs/IPAD.md); elsewhere the header belongs to the collection screen around
 * the tabs and this stack shows none.
 */
export function CollectionTabStack() {
  const { inTabs } = useCollectionChrome();
  const { boldText, textSize } = useSettings();
  const backgroundColor = useScreenBackground();
  const fontSize = androidHeaderTitleSize(textSize);
  return (
    <Stack
      screenOptions={{
        headerShown: inTabs,
        contentStyle: { backgroundColor },
        headerLargeTitle: false,
        headerTitleStyle: { ...(boldText ? { fontWeight: '700' } : {}), ...(fontSize != null ? { fontSize } : {}) },
      }}
    />
  );
}

/** The collection's header inside a tab's screen, when the tab carries it. */
export function CollectionTabHeader() {
  const { inTabs } = useCollectionChrome();
  return inTabs ? <CollectionHeader /> : null;
}
