import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Host } from './Host';

/**
 * A bounded Compose Host otherwise keeps its full height behind the IME. Resize it so FieldGroup can reveal
 * the focused input. The extra gap accounts for the native row's padding below the text/caret.
 *
 * `keyboardBar` (e.g. the Markdown formatting bar) sits below the Host, so it docks right above the keyboard;
 * without a soft keyboard (hardware keyboard) it keeps clear of the gesture bar.
 */
export function FormHost({ children, keyboardBar }: { children: ReactNode; keyboardBar?: ReactNode }) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="height"
      keyboardVerticalOffset={headerHeight + (keyboardBar ? 0 : 24)}>
      <Host style={{ flex: 1 }}>{children}</Host>
      {keyboardBar ? <View style={{ paddingBottom: keyboard ? 0 : insets.bottom }}>{keyboardBar}</View> : null}
    </KeyboardAvoidingView>
  );
}
