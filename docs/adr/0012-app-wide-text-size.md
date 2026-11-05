# App-wide text size through a local native module

The app has its own text size (Klein … Riesig) and bold text, independent of the system setting, because family members need larger text in this app without changing their whole phone. React Native's own scaling doesn't reach the native `@expo/ui` controls, so the local module `modules/text-size` overrides the platform instead: on Android `fontScale` / `fontWeightAdjustment` on the resources (re-applied after configuration changes), on iOS scene trait overrides (iOS 17+). Native views only read these when they are created, so the root navigator remounts on a change (`remountKey`), keeping the navigation state.

## Consequences

- `src/ui/Text` maps fixed sizes to Dynamic Type styles on iOS; React Native text outside native rows scales in JS (`rnTextScale`).
- The Android stack header ignores the override, so `_layout.tsx` sets its title size itself (`androidHeaderTitleSize`).
- iOS tab bar labels don't scale (standard iOS; long-press shows the large-content viewer).
- Language changes use the same remount.
