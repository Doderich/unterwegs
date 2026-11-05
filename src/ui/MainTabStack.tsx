import { Stack } from 'expo-router';

import { androidHeaderTitleSize } from '@/settings/apply';
import { useSettings } from '@/settings/store';
import { useScreenBackground } from './useScreenBackground';
import { useMainToolbarOptions } from './MainToolbar';

/** A tab's native header travels with its content instead of chasing global route state. */
export function MainTabStack({ title, tab }: { title: string; tab: string }) {
  const { boldText, textSize } = useSettings();
  const backgroundColor = useScreenBackground();
  const toolbar = useMainToolbarOptions(tab);
  const fontSize = androidHeaderTitleSize(textSize);
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor },
        headerLargeTitle: false,
        headerTitleStyle: { ...(boldText ? { fontWeight: '700' } : {}), ...(fontSize != null ? { fontSize } : {}) },
      }}>
      <Stack.Screen name="index" options={{ title, ...toolbar }} />
    </Stack>
  );
}
