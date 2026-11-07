import { sameNativeProps } from '../stableNative';

const base = { placeholder: 'Name', autoCorrect: false, onChangeText: () => {} };

it('skips a render when only the screen around the view changed', () => {
  // New closures and inline style objects on every keystroke must not reach the native view.
  expect(
    sameNativeProps(
      { ...base, onSubmitEditing: () => {}, style: { padding: 4 } },
      { ...base, onChangeText: () => {}, onSubmitEditing: () => {}, style: { padding: 4 } },
    ),
  ).toBe(true);
});

it('renders when a visible prop changes', () => {
  expect(sameNativeProps(base, { ...base, placeholder: 'Title' })).toBe(false);
  expect(sameNativeProps({ ...base, editable: true }, { ...base, editable: false })).toBe(false);
  expect(sameNativeProps({ ...base, style: { padding: 4 } }, { ...base, style: { padding: 8 } })).toBe(false);
});

it('renders when a handler is added or removed, since some add a native modifier', () => {
  expect(sameNativeProps(base, { ...base, onSubmitEditing: () => {} })).toBe(false);
  expect(sameNativeProps({ ...base, onSubmitEditing: () => {} }, base)).toBe(false);
});

it('compares date selections and option lists by value when asked to', () => {
  const day = (iso: string) => ({ selection: new Date(iso), displayedComponents: ['date'] });
  const byValue = ['selection', 'displayedComponents', 'options'];
  expect(sameNativeProps(day('2026-11-07T00:00:00Z'), day('2026-11-07T00:00:00Z'), byValue)).toBe(true);
  expect(sameNativeProps(day('2026-11-07T00:00:00Z'), day('2026-11-08T00:00:00Z'), byValue)).toBe(false);
  const options = (label: string) => ({ options: [{ value: 'hotel', label }] });
  expect(sameNativeProps(options('Hotel'), options('Hotel'), byValue)).toBe(true);
  expect(sameNativeProps(options('Hotel'), options('Hostel'), byValue)).toBe(false);
});

it('never treats a changed ref as unchanged', () => {
  expect(sameNativeProps({ ref: () => {} }, { ref: () => {} })).toBe(false);
});

it('ignores props the view reads only on mount', () => {
  // `@expo/ui` TextInput reads `defaultValue` once; forms that pass their current state there must not re-render it.
  expect(
    sameNativeProps({ ...base, defaultValue: 'Ribeira' }, { ...base, defaultValue: 'Ribeira G' }, [], ['defaultValue']),
  ).toBe(true);
  expect(sameNativeProps({ ...base, defaultValue: 'Ribeira' }, { ...base, defaultValue: 'Ribeira G' })).toBe(false);
});
