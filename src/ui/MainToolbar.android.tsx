import { DropdownMenu, DropdownMenuItem, Host, Icon, RNHostView } from '@expo/ui/jetpack-compose';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { SymbolView, type AndroidSymbol } from 'expo-symbols';

import { useOnline } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { materialIcon } from './icons';
import { Text } from './Text';
import { useColors } from './theme';
import { ACCENT_SEED } from './accent';

// Each tab retains its own actions alongside its native header and content.
export function useMainToolbarOptions(tab: string) {
  return useMemo(() => ({ headerRight: () => <HeaderActions tab={tab} /> }), [tab]);
}

export function MainToolbar({ tab }: { tab: string }) {
  const options = useMainToolbarOptions(tab);
  return <Stack.Screen options={options} />;
}

function HeaderActions({ tab }: { tab: string }) {
  const online = useOnline();
  return (
    <View style={styles.actions}>
      {online && tab !== 'world' ? <CreateButton key="create" tab={tab} /> : null}
      <HeaderButton
        key="settings"
        icon="settings"
        label={tr('common.settings')}
        onPress={() => router.push('/settings')}
      />
    </View>
  );
}

function HeaderButton({ icon, label, onPress }: { icon: AndroidSymbol; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: colors.border, borderless: true }}
      style={styles.button}>
      <SymbolView name={{ android: icon }} tintColor={colors.text} size={24} pointerEvents="none" />
    </Pressable>
  );
}

/** Keep the Add trigger mounted when it switches between a menu and a direct action. */
function CreateButton({ tab }: { tab: string }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <Host matchContents colorScheme={scheme} seedColor={ACCENT_SEED} style={styles.button}>
      <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <HeaderButton
              icon="add_circle"
              label={
                tab === 'places'
                  ? tr('common.newPlace')
                  : tab === 'collections'
                    ? tr('common.newTrip')
                    : tr('dayEdit.add')
              }
              onPress={() => {
                if (tab === 'places') router.push('/place-edit');
                else if (tab === 'collections') router.push('/collection-edit');
                else setExpanded(true);
              }}
            />
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          <DropdownMenuItem
            onClick={() => {
              setExpanded(false);
              router.push('/collection-edit');
            }}>
            <DropdownMenuItem.LeadingIcon>
              <Icon source={materialIcon('luggage')} tint={colors.text} size={24} />
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text>{tr('common.newTrip')}</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setExpanded(false);
              router.push('/place-edit');
            }}>
            <DropdownMenuItem.LeadingIcon>
              <Icon source={materialIcon('location')} tint={colors.text} size={24} />
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text>{tr('common.newPlace')}</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center' },
  button: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
