import { router, Stack, useLocalSearchParams, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import { CollectionProvider, useCollectionContext } from '@/data/CollectionContext';
import { collectionCreation } from '@/data/collectionCreation';
import { isMember, isOwner, viewToday } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { useCollectionsActions } from '@/data/useCollectionsActions';
import { tr } from '@/i18n';
import { useSettings } from '@/settings/store';
import { formatDayLabel } from '@/time/tz';
import { sfSymbol, toolbarIcon } from '@/ui/icons';
import { safeFileName, useServerFile } from '@/ui/serverFile';
import { useColors } from '@/ui/theme';
import { useScreenBackground } from '@/ui/useScreenBackground';
import { useTabBarColors } from '@/ui/useTabBarColors';

export default function CollectionLayout() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  return (
    <CollectionProvider collectionId={id}>
      <CollectionTitle fallback={name} />
      <CollectionTabs />
    </CollectionProvider>
  );
}

function CollectionTitle({ fallback }: { fallback?: string }) {
  const { view, collectionId, selectedDay, planMode } = useCollectionContext();
  const segments: readonly string[] = useSegments();
  const actions = useCollectionsActions();
  const edits = useCollectionEdits(view);
  const [creating, setCreating] = useState(false);
  const serverFile = useServerFile();
  const title = (
    <Stack.Screen
      options={{
        title: view?.collection.name ?? fallback ?? '',
        headerBackButtonDisplayMode: 'default',
        headerShown: !segments.includes('search'),
      }}
    />
  );
  if (segments.includes('search')) return title;
  // Creating works offline (ADR 0016); the collection menu (sharing, export, archive …) needs a connection.
  if (!view || !isMember(view.collection))
    return (
      <>
        {title}
        <Stack.Toolbar placement="right">
          {Platform.OS !== 'ios' ? (
            <Stack.Toolbar.Button
              icon={toolbarIcon('search') as never}
              accessibilityLabel={tr('common.search')}
              onPress={() => router.push({ pathname: '/search', params: { collectionId } })}
            />
          ) : null}
        </Stack.Toolbar>
      </>
    );

  const owner = isOwner(view.collection);
  const today = viewToday(view).date;
  const creation = collectionCreation(
    (segments.at(-1) === '[id]' || segments.at(-1) === 'index') && planMode === 'overview' ? 'days' : segments.at(-1),
    view.days.map((d) => d.date),
    selectedDay,
    today,
  );
  const name = view.collection.name;

  const newChecklist = async (day?: string) => {
    if (creating) return;
    setCreating(true);
    try {
      const created = await edits.createChecklist(tr('common.newChecklist'), day ?? null);
      if (created)
        router.push({
          pathname: '/note/[collectionId]/[itemId]',
          params: { collectionId, itemId: created.id, edit: '1' },
        });
    } finally {
      setCreating(false);
    }
  };

  const creationActions = (day?: string) => {
    const params = { collectionId, ...(day ? { day } : {}) };
    return [
      ...(creation.kinds.includes('location')
        ? [
            <Stack.Toolbar.MenuAction
              key="location"
              icon={toolbarIcon('location') as never}
              onPress={() => router.push({ pathname: '/location-edit/[collectionId]', params })}>
              {tr('common.newPlace')}
            </Stack.Toolbar.MenuAction>,
          ]
        : []),
      ...(creation.kinds.includes('lodging')
        ? [
            <Stack.Toolbar.MenuAction
              key="lodging"
              icon={toolbarIcon('lodging') as never}
              onPress={() => router.push({ pathname: '/lodging-edit/[collectionId]', params })}>
              {tr('common.newStay')}
            </Stack.Toolbar.MenuAction>,
          ]
        : []),
      ...(creation.kinds.includes('transportation')
        ? [
            <Stack.Toolbar.MenuAction
              key="transportation"
              icon={toolbarIcon('train') as never}
              onPress={() => router.push({ pathname: '/transport-edit/[collectionId]', params })}>
              {tr('common.newConnection')}
            </Stack.Toolbar.MenuAction>,
          ]
        : []),
      ...(creation.kinds.includes('note')
        ? [
            <Stack.Toolbar.MenuAction
              key="note"
              icon={toolbarIcon('note') as never}
              onPress={() => router.push({ pathname: '/note-edit/[collectionId]', params })}>
              {tr('common.newNote')}
            </Stack.Toolbar.MenuAction>,
          ]
        : []),
      ...(creation.kinds.includes('checklist')
        ? [
            <Stack.Toolbar.MenuAction
              key="checklist"
              icon={toolbarIcon('checklist') as never}
              disabled={creating}
              onPress={() => void newChecklist(day)}>
              {tr('common.newChecklist')}
            </Stack.Toolbar.MenuAction>,
          ]
        : []),
      ...(day
        ? [
            <Stack.Toolbar.MenuAction
              key="existing"
              icon={toolbarIcon('addToPlan') as never}
              onPress={() =>
                router.push({ pathname: '/day-edit/[collectionId]/[date]', params: { collectionId, date: day } })
              }>
              {tr('dayEdit.addFromTrip')}
            </Stack.Toolbar.MenuAction>,
          ]
        : []),
    ];
  };

  const confirm = (question: string, detail: string, verb: string, run: () => Promise<unknown>) =>
    Alert.alert(question, detail, [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: verb,
        style: 'destructive',
        onPress: async () => {
          const ok = await run();
          if (ok) router.dismissTo('/');
        },
      },
    ]);

  return (
    <>
      {title}
      <Stack.Toolbar placement="right">
        {Platform.OS !== 'ios' ? (
          <Stack.Toolbar.Button
            icon={toolbarIcon('search') as never}
            accessibilityLabel={tr('common.search')}
            onPress={() => router.push({ pathname: '/search', params: { collectionId } })}
          />
        ) : null}
        <Stack.Toolbar.Menu
          icon={toolbarIcon('add') as never}
          accessibilityLabel={tr('dayEdit.add')}
          disabled={creating}>
          {creation.chooseDay
            ? view.days.map((day) => (
                <Stack.Toolbar.Menu
                  key={day.date}
                  title={`${tr('common.dayN', { n: day.number })} · ${formatDayLabel(day.date)}`}>
                  {creationActions(day.date)}
                </Stack.Toolbar.Menu>
              ))
            : creationActions(creation.day)}
        </Stack.Toolbar.Menu>
        {actions.online ? (
          <Stack.Toolbar.Menu icon={toolbarIcon('more') as never} accessibilityLabel={tr('collection.tripMenu')}>
            {owner ? (
              <Stack.Toolbar.MenuAction
                icon={toolbarIcon('edit') as never}
                onPress={() => router.push({ pathname: '/collection-edit', params: { collectionId } })}>
                {tr('common.editTrip')}
              </Stack.Toolbar.MenuAction>
            ) : null}
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon('share') as never}
              onPress={() => {
                const share = (aspect: 'square' | 'story') =>
                  void serverFile.share(
                    `/api/collections/${collectionId}/share-image/${aspect}`,
                    safeFileName(`${name}-${aspect}`, 'png'),
                    'image/png',
                    name,
                  );
                Alert.alert(tr('common.shareAsImage'), tr('collection.imageOfTripWithCover'), [
                  { text: tr('common.cancel'), style: 'cancel' },
                  { text: tr('common.square'), onPress: () => share('square') },
                  { text: tr('common.portraitStory'), onPress: () => share('story') },
                ]);
              }}>
              {tr('common.shareAsImage')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon('pdf') as never}
              onPress={() =>
                void serverFile.open(
                  `/api/collections/${collectionId}/export-pdf`,
                  safeFileName(name, 'pdf'),
                  'application/pdf',
                  name,
                )
              }>
              {tr('collection.itineraryAsPdf')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              icon={toolbarIcon('file') as never}
              onPress={() =>
                void serverFile.share(
                  `/api/collections/${collectionId}/export`,
                  safeFileName(name, 'zip'),
                  'application/zip',
                  name,
                )
              }>
              {tr('collection.exportZip')}
            </Stack.Toolbar.MenuAction>
            {owner ? (
              <Stack.Toolbar.MenuAction
                icon={toolbarIcon('copy') as never}
                onPress={() =>
                  Alert.alert(
                    tr('collection.duplicateNameConfirm', { name }),
                    tr('collection.lodgingTransportationNotesChecklistsDay'),
                    [
                      { text: tr('common.cancel'), style: 'cancel' },
                      {
                        text: tr('collection.duplicate'),
                        onPress: async () => {
                          const copy = await actions.duplicateCollection(collectionId, name);
                          if (copy)
                            router.replace({ pathname: '/collection/[id]', params: { id: copy.id, name: copy.name } });
                        },
                      },
                    ],
                  )
                }>
                {tr('collection.duplicateTrip')}
              </Stack.Toolbar.MenuAction>
            ) : null}
            {owner ? (
              <Stack.Toolbar.MenuAction
                icon={toolbarIcon('group') as never}
                onPress={() => router.push({ pathname: '/collection-share/[collectionId]', params: { collectionId } })}>
                {tr('common.share')}
              </Stack.Toolbar.MenuAction>
            ) : null}
            {owner && view.collection.is_archived ? (
              <Stack.Toolbar.MenuAction
                icon={toolbarIcon('unarchive') as never}
                onPress={() => void actions.setArchived(collectionId, false)}>
                {tr('collection.restoreFromArchive')}
              </Stack.Toolbar.MenuAction>
            ) : null}
            {owner && !view.collection.is_archived ? (
              <Stack.Toolbar.MenuAction
                icon={toolbarIcon('archive') as never}
                onPress={() =>
                  confirm(
                    tr('collection.archiveNameConfirm', { name }),
                    tr('collection.itLeavesListStaysUnder'),
                    tr('collection.archive'),
                    () => actions.setArchived(collectionId, true),
                  )
                }>
                {tr('collection.archive')}
              </Stack.Toolbar.MenuAction>
            ) : null}
            {owner ? (
              <Stack.Toolbar.MenuAction
                destructive
                icon={toolbarIcon('delete') as never}
                onPress={() =>
                  confirm(
                    tr('common.deleteNameConfirm', { name }),
                    tr('collection.tripPlanStaysConnectionsNotes'),
                    tr('common.delete'),
                    () => actions.deleteCollection(collectionId),
                  )
                }>
                {tr('collection.deleteTrip')}
              </Stack.Toolbar.MenuAction>
            ) : (
              <Stack.Toolbar.MenuAction
                destructive
                icon={toolbarIcon('logout') as never}
                onPress={() =>
                  confirm(
                    tr('collection.leaveNameConfirm', { name }),
                    tr('collection.tripDisappearsFromPhoneOwner'),
                    tr('collection.leave'),
                    () => actions.leave(collectionId),
                  )
                }>
                {tr('collection.leaveTrip')}
              </Stack.Toolbar.MenuAction>
            )}
          </Stack.Toolbar.Menu>
        ) : null}
      </Stack.Toolbar>
    </>
  );
}

function CollectionTabs() {
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
      <NativeTabs.Trigger name="index" accessibilityLabel={tr('collection.plan')} contentStyle={{ backgroundColor }}>
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
        hidden={Platform.OS !== 'ios'}>
        <NativeTabs.Trigger.Label hidden={Platform.OS === 'ios' && !showTabLabels}>
          {tr('common.search')}
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
