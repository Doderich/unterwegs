import { TextInput as NativeTextInput } from '@expo/ui';

import { stableNative } from './stableNative';

export type { TextInputProps, TextInputRef } from '@expo/ui';

/**
 * `TextInput` from `@expo/ui` that renders the native field only when its own props change. Without this, every
 * render of the screen around it re-applies all of the field's props: on iOS that resets SwiftUI's
 * `textContentType` and the other modifiers, and the autofill bar above the keyboard flickers while typing.
 * The typed text lives in native state either way. `defaultValue` is read only when the field mounts (forms reset a
 * field by changing its `key`), so forms that pass their current state as `defaultValue` don't re-render it.
 */
export const TextInput = stableNative(NativeTextInput, { ignored: ['defaultValue'] });
