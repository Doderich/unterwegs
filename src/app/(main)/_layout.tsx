import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';

import { tr } from '@/i18n';
import { usePrefetchMainData } from '@/data/usePrefetchMainData';
import { useScreenBackground } from '@/ui/useScreenBackground';
import { useSettings } from '@/settings/store';
import { sfSymbol } from '@/ui/icons';
import { useColors } from '@/ui/theme';
import { useTabBarColors } from '@/ui/useTabBarColors';
import { ScreenSearchProvider, useScreenSearchActions } from '@/ui/ScreenSearch';

/** App destinations live here; opening a collection pushes a separate tab workspace on the root stack. */
export default function MainLayout() {
  return (
    <ScreenSearchProvider>
      <MainTabs />
    </ScreenSearchProvider>
  );
}

function MainTabs() {
  const search = useScreenSearchActions();
  const colors = useColors();
  const tabBar = useTabBarColors();
  const backgroundColor = useScreenBackground();
  usePrefetchMainData();
  const { boldText, showTabLabels } = useSettings();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NativeTabs
        tintColor={colors.tint}
        {...tabBar}
        minimizeBehavior="onScrollDown"
        labelStyle={boldText ? { fontWeight: '700' } : undefined}>
        <NativeTabs.Trigger name="(home)" contentStyle={{ backgroundColor }} accessibilityLabel={tr('shell.home')}>
          <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
            {tr('shell.home')}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house" md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          name="collections"
          contentStyle={{ backgroundColor }}
          accessibilityLabel={tr('common.trips')}>
          <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
            {Platform.OS === 'ios' ? tr('shell.collectionsTab') : tr('common.trips')}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={sfSymbol('luggage') as never} md="luggage" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="places" contentStyle={{ backgroundColor }} accessibilityLabel={tr('shell.places')}>
          <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
            {tr('shell.places')}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={sfSymbol('location') as never} md="location_on" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="world" contentStyle={{ backgroundColor }} accessibilityLabel={tr('common.world')}>
          <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
            {tr('common.world')}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={sfSymbol('world') as never} md="public" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          name="find"
          accessibilityLabel={tr('common.search')}
          contentStyle={{ backgroundColor }}
          role="search"
          hidden={Platform.OS !== 'ios'}
          disabled
          listeners={{ tabPress: () => search?.focus() }}>
          <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
            {tr('common.search')}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
