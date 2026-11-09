import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useIsRestoring } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { SessionProvider, useSession } from '@/auth/session';
import { useGlances } from '@/glances/useGlances';
import { persistOptions, persister } from '@/data/persist';
import { createQueryClient } from '@/data/queries';
import { wipeLocalData } from '@/offline/wipe';
import { tr } from '@/i18n';
import { CelebrationHost } from '@/ui/Celebration';
import { androidHeaderTitleSize, remountKey } from '@/settings/apply';
import { useSettings } from '@/settings/store';
import { reportAppStarted } from '@/telemetry/health';
import { useColors, useReduceMotion } from '@/ui/theme';
import { useScreenBackground } from '@/ui/useScreenBackground';
import { ErrorScreen } from '@/ui/ErrorScreen';

/**
 * A screen that crashes while rendering shows `ErrorScreen` and keeps the header; the rest of the app stays usable.
 * Home stays under a screen opened from a link (a widget, the Live Activity, a shared file), so Back can leave it.
 */
export const unstable_settings = { anchor: '(main)', screenErrorBoundary: ErrorScreen };

/** Last resort when the root itself fails. */
export { ErrorScreen as ErrorBoundary };

export default function RootLayout() {
  const settings = useSettings();
  return (
    <SessionProvider>
      <QueryProvider>
        <NavigationTheme>
          <RootStack key={remountKey(settings)} />
          <CelebrationHost />
        </NavigationTheme>
      </QueryProvider>
    </SessionProvider>
  );
}

/**
 * Persisted query cache (offline reading). An AuthError from any query signs out once the key is confirmed rejected,
 * and wipes cached data once signed out; downloaded files and map areas only when the user chose so.
 */
function QueryProvider({ children }: { children: ReactNode }) {
  const { session, onAuthError } = useSession();
  // onAuthError is stable (it only depends on the stable signOut), so capturing it once is safe.
  const [queryClient] = useState(() => createQueryClient(onAuthError));

  const wipe = session.status === 'signedOut' && session.wipe;
  useEffect(() => {
    if (session.status === 'signedOut') {
      queryClient.clear();
      void persister.removeClient();
    }
  }, [session.status, queryClient]);
  useEffect(() => {
    if (wipe) void wipeLocalData();
  }, [wipe]);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}

function NavigationTheme({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const colors = useColors();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const background = useScreenBackground();
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.tint,
          background,
          // Android headers take `card`: the Material surface, so they match the screen below them.
          ...(Platform.OS === 'android' && { card: background, text: colors.text, border: colors.border }),
        },
      }}>
      {/* Follow the app appearance, not the system one: Android otherwise keeps white icons on light headers. */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

function RootStack() {
  const { session } = useSession();
  const restoring = useIsRestoring();
  useGlances(session.status);
  useEffect(() => {
    if (session.status === 'loading' || restoring) return;
    const frame = requestAnimationFrame(reportAppStarted);
    return () => cancelAnimationFrame(frame);
  }, [session.status, restoring]);
  const reduceMotion = useReduceMotion();
  const { textSize, boldText } = useSettings();
  const titleSize = androidHeaderTitleSize(textSize);
  if (session.status === 'loading') return null;
  const signedIn = session.status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        animation: reduceMotion ? 'none' : 'default',
        headerTitleStyle: {
          ...(titleSize !== null && { fontSize: titleSize }),
          ...(boldText && { fontWeight: '700' }),
        },
        headerLargeTitleStyle: boldText ? { fontWeight: '800' } : undefined,
      }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(main)" options={{ title: tr('shell.home'), headerShown: Platform.OS !== 'android' }} />
        <Stack.Screen name="settings/index" options={{ title: tr('common.settings') }} />
        <Stack.Screen name="settings/reading" options={{ title: tr('settings.accessibility') }} />
        <Stack.Screen name="settings/appearance" options={{ title: tr('settings.appearance') }} />
        <Stack.Screen name="settings/reminders" options={{ title: tr('settings.reminders') }} />
        <Stack.Screen name="licenses/index" options={{ title: tr('settings.openSourceLicenses') }} />
        <Stack.Screen name="licenses/[index]" options={{ title: '' }} />
        <Stack.Screen name="integrations/index" options={{ title: tr('common.integrations') }} />
        <Stack.Screen name="integrations/[kind]" options={{ title: tr('app.integration') }} />
        <Stack.Screen name="integrations/strava-connect" options={{ title: tr('common.connectStrava') }} />
        <Stack.Screen name="account/index" options={{ title: tr('common.manageAccount') }} />
        <Stack.Screen name="account/keys" options={{ title: tr('common.apiKeys') }} />
        <Stack.Screen name="account/delete" options={{ title: tr('common.deleteAccount') }} />
        <Stack.Screen name="account/restore" options={{ title: tr('accountRestore.title') }} />
        <Stack.Screen name="account/security" options={{ title: tr('accountSecurity.title') }} />
        <Stack.Screen name="offline-maps/[collectionId]" options={{ title: tr('common.offlineMaps') }} />
        <Stack.Screen name="world/map" options={{ title: tr('app.allLocations') }} />
        <Stack.Screen name="world/countries" options={{ title: tr('common.countries') }} />
        <Stack.Screen name="world/[code]" options={{ title: '' }} />
        <Stack.Screen name="world/region/[id]" options={{ title: '' }} />
        <Stack.Screen name="categories/index" options={{ title: tr('common.categories') }} />
        <Stack.Screen name="category-edit" options={{ title: tr('common.category'), presentation: 'modal' }} />
        <Stack.Screen name="calendar" options={{ title: tr('common.calendar') }} />
        <Stack.Screen name="search" options={{ title: tr('common.search') }} />
        <Stack.Screen name="people/index" options={{ title: tr('common.people') }} />
        <Stack.Screen name="people/[username]" options={{ title: '' }} />
        <Stack.Screen name="immich/[collectionId]/[locationId]" options={{ title: tr('common.photoFromImmich') }} />
        <Stack.Screen name="nearby/[collectionId]" options={{ title: tr('common.nearby') }} />
        <Stack.Screen name="web-image/[collectionId]" options={{ title: tr('common.photoFromWeb') }} />
        <Stack.Screen
          name="activity-edit/[collectionId]"
          options={{ title: tr('app.activity'), presentation: 'modal' }}
        />
        <Stack.Screen name="collection/[id]" options={{ title: '' }} />
        <Stack.Screen name="place/[id]" options={{ title: tr('common.place') }} />
        <Stack.Screen name="place-edit" options={{ title: tr('common.place'), presentation: 'modal' }} />
        <Stack.Screen name="place-visit/[id]" options={{ title: tr('common.addVisit'), presentation: 'modal' }} />
        <Stack.Screen name="lodging/[collectionId]/[itemId]" options={{ title: tr('common.accommodation') }} />
        <Stack.Screen name="transport/[collectionId]/[itemId]" options={{ title: tr('common.transport') }} />
        <Stack.Screen name="location/[collectionId]/[itemId]" options={{ title: tr('common.place') }} />
        <Stack.Screen name="note/[collectionId]/[itemId]" options={{ title: tr('common.note') }} />
        <Stack.Screen name="note-edit/[collectionId]" options={{ title: tr('common.note'), presentation: 'modal' }} />
        <Stack.Screen name="day-edit/[collectionId]/[date]" options={{ title: tr('common.editDay') }} />
        <Stack.Screen name="share" options={{ title: tr('app.shared'), presentation: 'modal' }} />
        <Stack.Screen
          name="lodging-edit/[collectionId]"
          options={{ title: tr('common.accommodation'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="transport-edit/[collectionId]"
          options={{ title: tr('common.transport'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="location-edit/[collectionId]"
          options={{ title: tr('common.place'), presentation: 'modal' }}
        />
        <Stack.Screen name="collection-edit" options={{ title: tr('common.trip'), presentation: 'modal' }} />
        <Stack.Screen name="collection-share/[collectionId]" options={{ title: tr('common.share') }} />
        <Stack.Screen
          name="visit-edit/[collectionId]/[locationId]"
          options={{ title: tr('common.visit'), presentation: 'modal' }}
        />
        <Stack.Screen
          name="gallery"
          options={{
            presentation: 'fullScreenModal',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
