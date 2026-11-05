import { router, Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useOnline } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { toolbarIcon } from '@/ui/icons';

export function MainToolbar({ tab }: { tab: string }) {
  const online = useOnline();
  return (
    <Stack.Toolbar placement="right">
      {Platform.OS !== 'ios' && tab !== 'places' ? (
        <Stack.Toolbar.Button
          icon={toolbarIcon('search') as never}
          accessibilityLabel={tr('common.search')}
          onPress={() => router.push('/search')}
        />
      ) : null}
      {online && tab !== 'world' ? (
        tab === 'places' ? (
          <Stack.Toolbar.Button
            icon={toolbarIcon('add') as never}
            accessibilityLabel={tr('common.newPlace')}
            onPress={() => router.push('/place-edit')}
          />
        ) : tab === 'collections' ? (
          <Stack.Toolbar.Button
            icon={toolbarIcon('add') as never}
            accessibilityLabel={tr('common.newTrip')}
            onPress={() => router.push('/collection-edit')}
          />
        ) : (
          <Stack.Toolbar.Menu icon={toolbarIcon('add') as never} accessibilityLabel={tr('dayEdit.add')}>
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon('luggage') as never}
              onPress={() => router.push('/collection-edit')}>
              {tr('common.newTrip')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon('location') as never}
              onPress={() => router.push('/place-edit')}>
              {tr('common.newPlace')}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        )
      ) : null}
      <Stack.Toolbar.Button
        icon={toolbarIcon('settings') as never}
        accessibilityLabel={tr('common.settings')}
        onPress={() => router.push('/settings')}
      />
    </Stack.Toolbar>
  );
}

/** iOS actions stay in the native Stack.Toolbar instead of headerRight. */
export function useMainToolbarOptions(_tab: string) {
  return {};
}
