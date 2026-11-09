import { FieldGroup, ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { useCollectionContext } from '@/data/CollectionContext';
import {
  collectionSuggestions,
  searchCollection,
  type CollectionGroup,
  type CollectionHit,
} from '@/data/collectionSearch';
import { useCollectionEdits } from '@/data/useCollectionEdits';
import { useLocations } from '@/data/useLocation';
import { tr } from '@/i18n';
import { formatTime } from '@/time/tz';

import { dayLabel } from './dayPlan';
import { openEntryDetail } from './entries';
import { transportIcon, type IconKey } from './icons';
import { Host } from './Host';
import { RefreshableFieldGroup } from './RefreshableFieldGroup';
import { RowIcon, useRowTheme } from './rows';
import { Sub } from './Sub';
import { Text } from './Text';

const GROUP_TITLE: Record<CollectionGroup, () => string> = {
  places: () => tr('collectionSearch.places'),
  stays: () => tr('collectionSearch.stays'),
  connections: () => tr('collectionSearch.connections'),
  notes: () => tr('collectionSearch.notes'),
  library: () => tr('collectionSearch.library'),
};

/**
 * Search inside the open collection, shown in place of its tabs while the search field is in use (docs/IPAD.md):
 * compact rows grouped by kind, each with its day, so finding one thing is quick. Before anything is typed it
 * offers tonight's stay and the next connection. Library places not in the collection come last, with Add.
 */
export function CollectionSearch({ query }: { query: string }) {
  const { view, collectionId } = useCollectionContext();
  const rt = useRowTheme();
  const edits = useCollectionEdits(view);
  const library = useLocations();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const groups = useMemo(
    () => (view ? searchCollection(query, view, library.data ?? []) : []),
    [query, view, library.data],
  );
  const suggestions = useMemo(() => (view ? collectionSuggestions(view) : []), [view]);
  if (!view) return null;

  const when = (hit: CollectionHit) => {
    if (hit.kind === 'library') return hit.place;
    if (!hit.day) return tr('map.onNoDay');
    const time = hit.day.startUtc ? formatTime(hit.day.startUtc, view.timeZone) : null;
    return [dayLabel(hit.day.day), time].filter(Boolean).join(' · ');
  };

  const icon = (hit: CollectionHit): IconKey => {
    if (hit.kind === 'transportation') {
      const t = view.collection.transportations.find((x) => x.id === hit.id);
      return t ? transportIcon(t.type) : 'train';
    }
    return hit.kind === 'library' ? 'location' : hit.kind;
  };

  const open = (hit: CollectionHit) => {
    if (hit.kind === 'library') return router.push({ pathname: '/place/[id]', params: { id: hit.id } });
    const entry = view.days
      .flatMap((d) => d.entries)
      .find((e) => {
        const object =
          e.kind === 'transportation'
            ? e.transport
            : e.kind === 'lodging'
              ? e.lodging
              : e.kind === 'location'
                ? e.location
                : e.kind === 'note'
                  ? e.note
                  : e.checklist;
        return object.id === hit.id;
      });
    if (entry) return openEntryDetail(collectionId, entry);
    const pathname =
      hit.kind === 'location'
        ? '/location/[collectionId]/[itemId]'
        : hit.kind === 'lodging'
          ? '/lodging/[collectionId]/[itemId]'
          : hit.kind === 'transportation'
            ? '/transport/[collectionId]/[itemId]'
            : '/note/[collectionId]/[itemId]';
    router.push({ pathname, params: { collectionId, itemId: hit.id } });
  };

  const add = async (hit: CollectionHit) => {
    if (await edits.linkLocation(hit.id)) setAdded((s) => new Set(s).add(hit.id));
  };

  const row = (hit: CollectionHit) => (
    <ListItem
      key={`${hit.kind}:${hit.id}`}
      colors={rt.listColors}
      leading={<RowIcon name={icon(hit)} />}
      supportingText={
        <Sub>
          {[when(hit), hit.excerpt, hit.kind === 'library' && !added.has(hit.id) ? tr('collectionSearch.add') : null]
            .filter(Boolean)
            .join('\n')}
        </Sub>
      }
      trailing={
        hit.kind === 'library' && edits.canEdit ? <RowIcon name={added.has(hit.id) ? 'check' : 'add'} /> : undefined
      }
      // A library place is added with one tap; once it is in, the tap opens it like any other result.
      onPress={() => (hit.kind === 'library' && edits.canEdit && !added.has(hit.id) ? void add(hit) : open(hit))}>
      {hit.title}
    </ListItem>
  );

  return (
    <Host style={{ flex: 1 }}>
      <RefreshableFieldGroup>
        {!query.trim() ? (
          suggestions.length ? (
            <FieldGroup.Section title={tr('collectionSearch.suggestions')}>{suggestions.map(row)}</FieldGroup.Section>
          ) : (
            // Nothing to suggest (a past collection): say what the search covers. An empty list would also lose
            // the page colour and show white.
            <FieldGroup.Section>
              <ListItem colors={rt.listColors} leading={<RowIcon name="search" />}>
                <Sub>{tr('search.collectionHint')}</Sub>
              </ListItem>
            </FieldGroup.Section>
          )
        ) : groups.length ? (
          groups.map((g) => (
            <FieldGroup.Section key={g.group} title={GROUP_TITLE[g.group]()}>
              {g.hits.map(row)}
            </FieldGroup.Section>
          ))
        ) : (
          <FieldGroup.Section>
            <Text textStyle={{ color: rt.colors.secondary }}>{tr('collectionSearch.nothingFound')}</Text>
          </FieldGroup.Section>
        )}
      </RefreshableFieldGroup>
    </Host>
  );
}
