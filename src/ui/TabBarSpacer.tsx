import { FieldGroup, Spacer } from '@expo/ui';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating iOS tab bar above the home indicator. */
const TAB_BAR = 56;

/**
 * Last section of a native list that sits inside a React Native view (e.g. a pager page) under the iOS tab bar:
 * there the list doesn't get the tab bar's safe area, so its last rows would stay hidden behind the bar.
 * Lists that are a tab's root view get it from iOS and don't need this; Android lays tabs out below the content.
 */
export function TabBarSpacer() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'ios') return null;
  return (
    <FieldGroup.Section>
      <FieldGroup.SectionFooter>
        <Spacer size={insets.bottom + TAB_BAR} />
      </FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}
