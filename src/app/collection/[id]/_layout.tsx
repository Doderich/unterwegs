import { Stack, useLocalSearchParams } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { CollectionProvider } from '@/data/CollectionContext';
import { tr } from '@/i18n';
import { useSettings } from '@/settings/store';
import { sfSymbol } from '@/ui/icons';
import { useColors } from '@/ui/theme';
import { useScreenBackground } from '@/ui/useScreenBackground';
import { useTabBarColors } from '@/ui/useTabBarColors';
import { CollectionSearch } from '@/ui/CollectionSearch';
import { SearchHeader } from '@/ui/MaterialSearch';
import { CollectionChromeProvider, CollectionHeader, useCollectionChrome } from '@/ui/CollectionHeader';
import { useRegularWidth } from '@/ui/regularWidth';

export default function CollectionLayout() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  // Regular-width iPad: each tab carries the header, so the tab bar sits in the header row like Home's.
  const inTabs = useRegularWidth();
  // Search stays on the collection on every platform (no new screen): the iPhone's Search tab button, the iPad's
  // header field and Android's magnifier all open it, and the results replace the tab while it is in use.
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(false);
  const searchBar = useRef<ComponentRef<typeof Stack.SearchBar>>(null);
  const android = Platform.OS === 'android';
  return (
    <CollectionProvider collectionId={id}>
      <CollectionChromeProvider
        value={{
          fallback: name,
          onSearch: setQuery,
          onSearchActive: setActive,
          searchActive: active,
          searchBar,
          inTabs,
        }}>
        {/* Android: the search bar takes the app bar's place while searching (Material search). */}
        <Stack.Screen options={{ headerShown: !inTabs && !(android && active) }} />
        {inTabs ? null : <CollectionHeader />}
        <View style={styles.fill}>
          <CollectionTabs />
          {active || query.trim() ? (
            <SearchOverlay
              query={query}
              android={android}
              inTabs={inTabs}
              onChange={setQuery}
              onClose={() => {
                setQuery('');
                setActive(false);
              }}
            />
          ) : null}
        </View>
      </CollectionChromeProvider>
    </CollectionProvider>
  );
}

/** The search results over the collection's tabs, below its header (or below Android's search bar). */
function SearchOverlay({
  query,
  android,
  inTabs,
  onChange,
  onClose,
}: {
  query: string;
  android: boolean;
  inTabs: boolean;
  onChange: (query: string) => void;
  onClose: () => void;
}) {
  const backgroundColor = useScreenBackground();
  const insets = useSafeAreaInsets();
  const header = useHeaderHeight();
  // iPad: the header belongs to the tab, so measure from the status bar; iPhone: the collection's own header.
  const top = android ? 0 : inTabs ? insets.top + TAB_HEADER : header;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor, paddingTop: top }]}>
      {android ? (
        <SearchHeader query={query} onChange={onChange} placeholder={tr('search.thisCollection')} onBack={onClose} />
      ) : null}
      <CollectionSearch query={query} />
    </View>
  );
}

/** A tab's navigation bar on iPad, measured on the iPad simulator (iPadOS 27). */
const TAB_HEADER = 50;

const styles = StyleSheet.create({ fill: { flex: 1 } });

function CollectionTabs() {
  const { onSearchActive } = useCollectionChrome();
  const colors = useColors();
  const backgroundColor = useScreenBackground();
  const { boldText, showTabLabels } = useSettings();
  const tabBar = useTabBarColors();
  return (
    <NativeTabs
      tintColor={colors.tint}
      {...tabBar}
      minimizeBehavior="onScrollDown"
      labelStyle={boldText ? { fontWeight: '700' } : undefined}>
      <NativeTabs.Trigger name="(plan)" accessibilityLabel={tr('collection.plan')} contentStyle={{ backgroundColor }}>
        <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
          {tr('collection.plan')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('today') as never} md="today" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="days"
        accessibilityLabel={tr('collection.days')}
        contentStyle={{ backgroundColor }}
        hidden>
        <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
          {tr('collection.days')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('days') as never} md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map" accessibilityLabel={tr('common.map')} contentStyle={{ backgroundColor }}>
        <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
          {tr('common.map')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('map') as never} md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lodgings" accessibilityLabel={tr('common.stays')} contentStyle={{ backgroundColor }}>
        <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
          {tr('common.stays')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('lodgings') as never} md="hotel" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notes" accessibilityLabel={tr('common.notes')} contentStyle={{ backgroundColor }}>
        <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
          {tr('common.notes')}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={sfSymbol('notes') as never} md="sticky_note_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="search"
        accessibilityLabel={tr('common.search')}
        contentStyle={{ backgroundColor }}
        role="search"
        // iPhone: the native search button opens the collection's search field instead of switching to a page;
        // iPad has the field in the header, Android a magnifier.
        hidden={Platform.OS !== 'ios' || Platform.isPad}
        disabled
        listeners={{ tabPress: () => onSearchActive(true) }}>
        <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
          {tr('common.search')}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
