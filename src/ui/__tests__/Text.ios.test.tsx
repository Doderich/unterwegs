import { Text as createText } from '../Text.ios';
import { Host as createHost } from '../Host';
import { useSettings } from '@/settings/store';

jest.mock('@expo/ui', () => ({ Text: 'NativeText' }));
jest.mock('@expo/ui/swift-ui', () => ({ Host: 'NativeHost' }));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  font: (config: object) => ({ $type: 'font', ...config }),
  bold: () => ({ $type: 'bold' }),
}));
jest.mock('@/settings/store', () => ({ useSettings: jest.fn() }));

beforeEach(() => {
  jest.mocked(useSettings).mockReturnValue({ boldText: true } as ReturnType<typeof useSettings>);
});

it.each([
  [undefined, 'body', 'semibold'],
  [{ fontSize: 15 }, 'subheadline', 'semibold'],
  [{ fontSize: 13, fontWeight: '400' as const }, 'footnote', 'semibold'],
  [{ fontSize: 20, fontWeight: '600' as const }, 'title3', 'heavy'],
])('applies bold text to plain, supporting and explicitly weighted labels: %j', (textStyle, textStyleName, weight) => {
  const element = createText({ textStyle, children: 'Label' });
  expect(element.props.modifiers).toContainEqual({ $type: 'font', textStyle: textStyleName, weight });
});

it('also applies bold to native labels that are not rendered through our Text wrapper', () => {
  expect(createHost({ children: 'Native controls' }).props.modifiers).toContainEqual({ $type: 'bold' });
});

it('restores normal weights and inherited native styling when bold is off', () => {
  jest.mocked(useSettings).mockReturnValue({ boldText: false } as ReturnType<typeof useSettings>);
  expect(createText({ children: 'Label' }).props.modifiers).toBeUndefined();
  expect(
    createText({ textStyle: { fontSize: 15, fontWeight: '400' }, children: 'Label' }).props.modifiers,
  ).toContainEqual({ $type: 'font', textStyle: 'subheadline', weight: 'regular' });
  expect(createHost({ children: 'Native controls' }).props.modifiers).toEqual([]);
});
