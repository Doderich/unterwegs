import { useIsRestoring, useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import type { Collection, CollectionSummary } from '@/api/schemas';
import { applyPending, getOutbox, subscribeOutbox } from '@/data/outbox';
import { queryKeys } from '@/data/queries';
import { collectionMediaUrls } from '@/data/selectors';
import { cachedCount } from '@/offline/fileCache';
import { openInMaps } from '@/ui/mapLinks';
import { tr } from '@/i18n';
import { getSettings, useSettings, type Settings } from '@/settings/store';

import { widgetGlances, type CachedCollection } from './compute';
import { planGlances } from './plan';
import { clearWidgetCovers, widgetCover } from './cover';
import { clearReminders, configureForegroundHandling, reminderResponse, syncReminders } from './notifications';
import { onGlancesRefresh, pinnedTravel, pinTravel } from './pinnedTravel';
import { endTravelActivity, syncTravelActivity, updateWidgets } from './surfaces';

/*
 * Keeps the glances (widgets, reminders, the travel-day Live Activity) in step with the offline copy: after a
 * collection is written to the cache, when the app comes to the foreground, and when a setting changes. Signed out,
 * every glance is emptied. ADR 0015, docs/GLANCES.md.
 */

const link = (path: string) => Linking.createURL(path.replace(/^\//, ''));

function cachedCollections(cache: QueryClient): Map<string, CachedCollection> {
  const out = new Map<string, CachedCollection>();
  for (const query of cache.getQueryCache().findAll({ queryKey: ['collection'] })) {
    const saved = query.state.data as Collection | undefined;
    // What the app shows: the offline copy with the edits still waiting to be sent (ADR 0016).
    const collection = saved?.id ? applyPending(saved, getOutbox()) : undefined;
    if (collection) out.set(collection.id, { collection, updatedAt: query.state.dataUpdatedAt });
  }
  return out;
}

const missingFiles = (collection: Collection) => {
  const { images, attachments } = collectionMediaUrls(collection);
  const urls = [...images, ...attachments];
  return urls.length - cachedCount(urls);
};

async function refresh(cache: QueryClient, settings: Settings) {
  const plan = planGlances({
    summaries: cache.getQueryData<CollectionSummary[]>(queryKeys.collections) ?? [],
    cached: cachedCollections(cache),
    now: new Date(),
    settings,
    pinned: pinnedTravel(),
    missingFiles: (entry) => missingFiles(entry.collection),
    link,
  });

  const covers: Record<string, string> = {};
  for (const entry of plan.widgets.coverFor) covers[entry.collection.id] = await widgetCover(entry.collection);
  updateWidgets(plan.widgets.timeline, { focusId: plan.widgets.focusId, covers, choices: plan.widgets.choices });

  if (plan.reminders) await syncReminders(plan.reminders);
  else await clearReminders();

  if (Platform.OS === 'ios') {
    if (plan.travel.unpin) pinTravel(null);
    await syncTravelActivity(plan.travel.activity, link);
  }
}

async function clearAll() {
  pinTravel(null);
  clearWidgetCovers();
  updateWidgets([{ date: new Date(), glances: widgetGlances(null, new Date(), link), byCollection: {} }], {
    focusId: null,
    covers: {},
    choices: [{ name: tr('glances.automatic'), value: 'auto' }],
  });
  await Promise.all([clearReminders(), endTravelActivity()]);
}

/** `status`: the session's; nothing happens while it is still loading. */
export function useGlances(status: 'loading' | 'signedIn' | 'signedOut') {
  const signedIn = status === 'signedIn';
  const cache = useQueryClient();
  const restoring = useIsRestoring();
  const { language, reminders, reminderKinds, travelActivity: activity } = useSettings();

  useEffect(() => {
    configureForegroundHandling();
  }, []);

  // Recompute now, on every successful collection fetch (debounced), and on return to the foreground.
  useEffect(() => {
    if (restoring || status === 'loading') return;
    if (!signedIn) {
      void clearAll();
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(cache, getSettings()).catch(() => {}), delay);
    };
    schedule(0);
    const unsubscribeCache = cache.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      const root = event.query.queryKey[0];
      if (root === 'collection' || root === 'collections') schedule(1000);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule(0);
    });
    const unsubscribePin = onGlancesRefresh(() => schedule(0));
    // An edit made offline changes what the widgets should show, before the server has it.
    const unsubscribeOutbox = subscribeOutbox(() => schedule(1000));
    return () => {
      clearTimeout(timer);
      unsubscribeCache();
      unsubscribePin();
      unsubscribeOutbox();
      appState.remove();
    };
  }, [cache, restoring, status, signedIn, language, reminders, reminderKinds, activity]);

  // A tapped reminder opens its object, also when it started the app.
  useEffect(() => {
    if (!signedIn || restoring) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const tapped = reminderResponse(response);
      if (!tapped) return;
      // "Download now" opens the collection, which downloads its files by itself before and during it.
      router.push(tapped.path as never);
      if (tapped.action === 'maps' && tapped.place)
        void openInMaps(tapped.place.label, tapped.place.latitude, tapped.place.longitude);
    };
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        open(response);
        if (response) void Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [signedIn, restoring]);
}
