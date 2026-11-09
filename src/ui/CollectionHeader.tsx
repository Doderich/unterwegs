import { router, Stack, useSegments } from 'expo-router';
import { createContext, useContext, useState, type ComponentRef, type RefObject } from 'react';
import { Alert, Platform } from 'react-native';

import { useCollectionContext } from '@/data/CollectionContext';
import { collectionCreation } from '@/data/collectionCreation';
import { isMember, isOwner, viewToday } from '@/data/selectors';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { useCollectionsActions } from '@/data/useCollectionsActions';
import { tr } from '@/i18n';

import { dayLabel } from './dayPlan';
import { useHeaderSearch } from './HeaderSearch';
import { toolbarIcon } from './icons';
import { safeFileName, useServerFile } from './serverFile';
import { ScaledText } from './ScaledText';
import { useColors } from './theme';
import { typeScale } from './typeScale';

/**
 * What the collection's header needs from the collection layout: the name before the collection loads, the search
 * callback, and whether the header sits in each tab (regular-width iPad, tabs in the header row) or on the
 * collection screen around the tabs (phone).
 */
export type CollectionChrome = {
  fallback?: string;
  onSearch: (query: string) => void;
  /** Search is in use: results (or suggestions before typing) replace the tab. */
  onSearchActive: (active: boolean) => void;
  searchActive: boolean;
  /** The iPhone's search field in the collection header, opened by the native Search tab button. */
  searchBar: RefObject<ComponentRef<typeof Stack.SearchBar> | null>;
  inTabs: boolean;
};
const ChromeContext = createContext<CollectionChrome>({
  onSearch: () => undefined,
  onSearchActive: () => undefined,
  searchActive: false,
  searchBar: { current: null },
  inTabs: false,
});
export const CollectionChromeProvider = ChromeContext.Provider;
export const useCollectionChrome = () => useContext(ChromeContext);

/**
 * The collection's header: title, + (what to create follows the tab), … (sharing, export, archive …) and search.
 * On a regular-width iPad each tab renders it in its own header, so the tab bar sits in the header row like Home's;
 * Back is then a button on the left with the collection's name beside it.
 */
export function CollectionHeader() {
  const chrome = useCollectionChrome();
  return <CollectionTitle {...chrome} />;
}

/**
 * In a tab's own header: the collection name as a header item, since the tab bar takes the centre. The toolbar only
 * reads its item components as direct children, so callers wrap this in `Stack.Toolbar.View` themselves.
 */
function TabTitle({ name }: { name: string }) {
  const colors = useColors();
  return (
    <ScaledText
      accessibilityRole="header"
      numberOfLines={1}
      maxScale={1.4}
      style={{ ...typeScale.bodyStrong, color: colors.text, paddingHorizontal: 8, maxWidth: 260 }}>
      {name}
    </ScaledText>
  );
}

function CollectionTitle({ fallback, onSearch, onSearchActive, searchActive, searchBar, inTabs }: CollectionChrome) {
  const { view, collectionId, selectedDay, planMode } = useCollectionContext();
  const segments: readonly string[] = useSegments();
  const actions = useCollectionsActions();
  const edits = useCollectionEdits(view);
  const [creating, setCreating] = useState(false);
  const serverFile = useServerFile();
  const ipadSearch = useHeaderSearch({
    placeholder: tr('search.thisCollection'),
    onChange: onSearch,
    onActive: onSearchActive,
  });
  const title = (
    <>
      <Stack.Screen
        options={{
          title: inTabs ? '' : (view?.collection.name ?? fallback ?? ''),
          headerBackButtonDisplayMode: 'default',
          // Android: the search bar takes the app bar's place while searching (Material search).
          headerShown: !segments.includes('search') && !(Platform.OS === 'android' && searchActive),
        }}
      />
      {inTabs ? (
        // The tab's stack starts here, so it has no Back of its own: this one leaves the collection.
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={toolbarIcon('back') as never}
            accessibilityLabel={tr('search.back')}
            onPress={() => router.back()}
          />
          <Stack.Toolbar.View hidesSharedBackground>
            <TabTitle name={view?.collection.name ?? fallback ?? ''} />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : null}
      {/* iPad: a magnifier apart from + and … that opens the field in the header; results show in place. */}
      {Platform.OS === 'ios' && Platform.isPad ? ipadSearch.bar : null}
      {Platform.OS === 'ios' && !Platform.isPad && searchActive ? (
        // iPhone: the native Search tab button opens this field over the collection; results show in place. It only
        // exists while searching, so the tab button stays the one way in.
        <Stack.SearchBar
          ref={searchBar}
          placement="integrated"
          autoFocus
          hideWhenScrolling={false}
          hideNavigationBar={false}
          obscureBackground={false}
          placeholder={tr('search.thisCollection')}
          onChangeText={(event) => onSearch(event.nativeEvent.text)}
          onCancelButtonPress={() => {
            onSearch('');
            onSearchActive(false);
          }}
        />
      ) : null}
    </>
  );
  // Android: the search bar replaces the app bar while searching; the toolbar would force the app bar back on.
  if (segments.includes('search') || (Platform.OS === 'android' && searchActive)) return title;
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
              onPress={() => onSearchActive(true)}
            />
          ) : null}
          {Platform.OS === 'ios' && Platform.isPad ? ipadSearch.button : null}
        </Stack.Toolbar>
      </>
    );

  const owner = isOwner(view.collection);
  const today = viewToday(view).date;
  const creation = collectionCreation(
    planTab(segments.at(-1)) && planMode === 'overview' ? 'days' : planTab(segments.at(-1)) ? 'index' : segments.at(-1),
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
            onPress={() => onSearchActive(true)}
          />
        ) : null}
        <Stack.Toolbar.Menu
          icon={toolbarIcon('add') as never}
          accessibilityLabel={tr('dayEdit.add')}
          disabled={creating}>
          {creation.chooseDay
            ? view.days.map((day) => (
                <Stack.Toolbar.Menu key={day.date} title={dayLabel(day)}>
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
        {Platform.OS === 'ios' && Platform.isPad ? ipadSearch.button : null}
      </Stack.Toolbar>
    </>
  );
}

/** The Plan tab: its route group, or the collection itself before a tab is chosen. */
const planTab = (segment: string | undefined) => segment === '[id]' || segment === 'index' || segment === '(plan)';
