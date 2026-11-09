import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MapScreen } from '../../app/collection/[id]/map';

jest.mock('@/ui/CollectionTabStack', () => ({ CollectionTabHeader: () => null }));
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useMemo: (fn: () => unknown) => fn(),
  useRef: (value: unknown) => ({ current: value }),
  // The preview's point is selected by key.
  useState: (value: unknown) => [value === null ? 'loc-place' : value, jest.fn()],
}));
jest.mock('@expo/ui', () => ({
  BottomSheet: 'BottomSheet',
  Column: 'Column',
  ListItem: 'ListItem',
  Row: 'Row',
  Spacer: 'Spacer',
}));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({ frame: (config: object) => ({ $type: 'frame', ...config }) }));
jest.mock('@maplibre/maplibre-react-native', () => ({
  Camera: 'Camera',
  GeoJSONSource: 'GeoJSONSource',
  Layer: 'Layer',
  Map: 'Map',
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-router/react-navigation', () => ({ useHeaderHeight: () => 106 }));
jest.mock('@/ui/topTabBar', () => ({ useTopTabBarInset: () => 0 }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 62, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@/data/CollectionContext', () => ({
  useCollectionContext: () => ({
    view: { days: [], collection: { id: 'sample', locations: [], lodging: [], transportations: [] } },
    collectionId: 'sample',
  }),
}));
jest.mock('@/data/selectors', () => ({
  mapData: () => ({
    points: [
      {
        key: 'loc-place',
        id: 'place',
        kind: 'location',
        title: 'Sample place',
        subtitle: null,
        latitude: 35,
        longitude: 135,
        dates: [],
      },
    ],
    lines: [],
  }),
}));
jest.mock('@/data/useOnlineAction', () => ({ useOnline: () => true }));
jest.mock('@/maps/regions', () => ({ MAP_STYLE: { light: 'light', dark: 'dark' } }));
jest.mock('@/maps/useOfflineMaps', () => ({ useOfflineMaps: () => ({ regions: [] }) }));
jest.mock('@/ui/Select', () => ({ useSelect: () => ({ row: null, sheet: null }) }));
jest.mock('@/ui/CollectionLoading', () => ({ CollectionLoading: 'CollectionLoading' }));
jest.mock('@/ui/Host', () => ({ Host: 'Host' }));
jest.mock('@/ui/UserOnMap', () => ({
  UserLocationMarker: 'UserLocationMarker',
  LocateButton: 'LocateButton',
  MapFab: 'MapFab',
}));
jest.mock('@/ui/Text', () => ({ Text: 'Text' }));
jest.mock('@/ui/Sub', () => ({ Sub: 'Sub' }));
jest.mock('@/ui/rows', () => ({ openInMaps: jest.fn(), RowIcon: 'Icon', useRowTheme: () => ({}) }));
jest.mock('@/ui/SheetRow', () => ({ SheetRow: 'SheetRow' }));
jest.mock('@/ui/PhotoListItem', () => ({
  photoListItem: () => null,
  photoGrid: (rows: unknown) => rows,
  photoSection: (_section: unknown, rows: unknown) => rows,
  usePhotoColumns: () => 1,
}));
jest.mock('@/ui/ActionSheet', () => ({ useActionSheet: () => ({ open: jest.fn(), sheet: null }) }));
jest.mock('@/data/useCollectionEdits', () => ({ useCollectionEdits: () => ({ canEdit: true }) }));
jest.mock('@/ui/theme', () => ({ useColors: () => ({ card: '#fff' }), useListColors: () => ({}) }));
jest.mock('@/ui/useTabVisited', () => ({ useTabVisited: () => true }));

/** Call function elements until the screen's own View is what the assertions see. */
function expand(node: ReactNode): ReactElement<{ children: ReactNode }> {
  let current = node;
  while (isValidElement(current) && typeof current.type === 'function' && current.type !== View) {
    const render = current.type as (props: unknown) => ReactNode;
    const next = render(current.props);
    if (!isValidElement(next)) throw new Error('Map screen did not render');
    current = next;
  }
  if (!isValidElement<{ children: ReactNode }>(current)) throw new Error('Map screen did not render');
  return current;
}

it('keeps the map controls below the entire iOS navigation bar', () => {
  Platform.OS = 'ios';
  const tree = expand(MapScreen());
  const filter = Children.toArray(tree.props.children).find(
    (child) =>
      isValidElement<{ style?: StyleProp<ViewStyle> }>(child) &&
      child.type === View &&
      StyleSheet.flatten(child.props.style)?.position === 'absolute',
  );
  if (!isValidElement<{ style: StyleProp<ViewStyle> }>(filter)) throw new Error('Missing map controls');
  expect(StyleSheet.flatten(filter.props.style)?.top).toBeGreaterThanOrEqual(106 + 12);
});

it('gives the place preview padded touch rows and space below the actions', () => {
  const tree = expand(MapScreen());
  const sheet = Children.toArray(tree.props.children).find(
    (child) => isValidElement(child) && child.type === 'BottomSheet',
  );
  if (!isValidElement<{ contentPadding: { bottom: number }; children: { props: { children: unknown[] } } }>(sheet))
    throw new Error('Missing preview');
  expect(sheet.props.contentPadding.bottom).toBeGreaterThanOrEqual(16);
  // The place, "Add to a day" (it is on no day yet) and "Open in Maps".
  const rows = Children.toArray(sheet.props.children.props.children as ReactNode);
  expect(rows).toHaveLength(3);
  expect(rows.every((row) => isValidElement(row) && row.type === 'SheetRow')).toBe(true);
});
