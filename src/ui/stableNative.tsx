import { memo, useLayoutEffect, useRef, useState, type ComponentType } from 'react';

/** Props compared by value by default: callers build them inline, so a new object must not count as a change. */
const DEFAULT_BY_VALUE = ['style', 'textStyle', 'modifiers'];

/**
 * Whether a native view may skip this render. Function props are left out: `stableNative` passes stable ones that
 * call the latest. Only whether one is set counts, because some add a native modifier (`onSubmit`).
 */
export function sameNativeProps(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  byValue: readonly string[] = DEFAULT_BY_VALUE,
  ignored: readonly string[] = [],
): boolean {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (ignored.includes(key)) continue;
    const a = prev[key];
    const b = next[key];
    if (Object.is(a, b)) continue;
    if (key !== 'ref' && typeof a === 'function' && typeof b === 'function') continue;
    if (byValue.includes(key) && JSON.stringify(a) === JSON.stringify(b)) continue;
    return false;
  }
  return true;
}

/**
 * Wraps an `@expo/ui` view so it renders only when its own props change. Every render of an `@expo/ui` view sends
 * all of its props to the native side again (iOS re-applies each one to SwiftUI), so a screen that re-renders on
 * every keystroke would reset native state the user is interacting with: the iOS autofill bar flickers, an open
 * date popover or menu can jump. Handlers go through stable wrappers that call the latest one; `byValue` props
 * (and `style`, `textStyle`, `modifiers`) are compared by content. React elements as children always count as a
 * change, so pass data (e.g. an options list) instead. `ignored` props never cause a render, for props the view
 * only reads when it mounts.
 */
export function stableNative<P extends object>(
  Component: ComponentType<P>,
  { byValue = [], ignored = [] }: { byValue?: readonly string[]; ignored?: readonly string[] } = {},
) {
  const compared = [...DEFAULT_BY_VALUE, ...byValue];
  const Memo = memo(Component, (prev, next) =>
    sameNativeProps(prev as Record<string, unknown>, next as Record<string, unknown>, compared, ignored),
  );
  function Stable(props: P) {
    const latest = useRef(props);
    useLayoutEffect(() => {
      latest.current = props;
    });
    const [proxies] = useState(() => new Map<string, (...args: unknown[]) => unknown>());
    const forwarded = { ...props } as Record<string, unknown>;
    for (const [name, value] of Object.entries(props)) {
      if (name === 'ref' || typeof value !== 'function') continue;
      let proxy = proxies.get(name);
      if (!proxy) {
        proxy = (...args) => (latest.current as Record<string, (...a: unknown[]) => unknown>)[name]?.(...args);
        proxies.set(name, proxy);
      }
      forwarded[name] = proxy;
    }
    return <Memo {...(forwarded as P)} />;
  }
  Stable.displayName = `Stable(${Component.displayName ?? Component.name ?? 'View'})`;
  return Stable;
}
