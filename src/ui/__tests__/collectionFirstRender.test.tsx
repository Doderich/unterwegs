import LodgingsScreen from '../../app/collection/[id]/lodgings';
import NotesScreen from '../../app/collection/[id]/notes';
import DaysScreen from '../../screens/DaysScreen';

jest.mock('@/ui/CollectionTabStack', () => ({ CollectionTabHeader: () => null }));
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: (value: unknown) => [value, jest.fn()],
}));
jest.mock('@expo/ui', () => ({
  FieldGroup: Object.assign(() => null, { Section: () => null }),
  ListItem: () => null,
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/data/CollectionContext', () => {
  const { collectionSchema } = jest.requireActual('@/api/schemas');
  const { buildCollectionView } = jest.requireActual('@/data/selectors');
  const collection = collectionSchema.parse({
    id: 'cached',
    name: 'Cached collection',
    start_date: '2026-11-05',
    end_date: '2026-11-05',
  });
  return { useCollectionContext: () => ({ view: buildCollectionView(collection), collectionId: collection.id }) };
});
jest.mock('@/data/useCollectionEdits', () => ({ useCollectionEdits: () => ({ canEdit: true, can: () => true }) }));
jest.mock('@/ui/useTabVisited', () => ({ useTabVisited: () => false }));
jest.mock('@/ui/Host', () => ({ Host: 'Host' }));
jest.mock('@/ui/Text', () => ({ Text: 'Text' }));
jest.mock('@/ui/GoneScreen', () => ({ GoneScreen: () => null }));
jest.mock('@/ui/Sub', () => ({ Sub: 'Sub' }));
jest.mock('@/ui/PhotoListItem', () => ({
  photoListItem: () => null,
  photoGrid: (rows: unknown) => rows,
  photoSection: (_section: unknown, rows: unknown) => rows,
  usePhotoColumns: () => 1,
}));
jest.mock('@/ui/ActionSheet', () => ({ useActionSheet: () => ({ sheet: null }) }));
jest.mock('@/ui/rows', () => ({ RowIcon: 'Icon', useRowTheme: () => ({ colors: {} }) }));
jest.mock('@/ui/theme', () => ({ useColors: () => ({}), useListColors: () => ({}) }));

it.each([
  ['Stays', LodgingsScreen],
  ['Notes', NotesScreen],
  ['All days', DaysScreen],
] as const)('%s renders restored collection data before its first focus', (_name, Screen) => {
  // This is the first, unfocused mount, with the shared collection already available.
  // A focus-dependent null return here is exactly the blank first-visit regression.
  expect(Screen()).not.toBeNull();
});
