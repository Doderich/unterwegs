import { Host, Icon } from '@expo/ui/jetpack-compose';
import {
  type ImageSourcePropType,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { rnTextScale } from '@/settings/apply';
import { useSettings } from '@/settings/store';
import type { SearchHeaderProps, SearchLauncherProps } from './MaterialSearch';
import { materialIcon } from './icons';
import { useMaterialScheme } from './palette.android';
import { useColors } from './theme';
import { ACCENT_SEED } from './accent';

function SearchIcon({ source }: { source: ImageSourcePropType }) {
  const colors = useColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <Host pointerEvents="none" colorScheme={scheme} seedColor={ACCENT_SEED} style={{ width: 24, height: 24 }}>
      <Icon source={source} size={24} tint={colors.text} />
    </Host>
  );
}

export function SearchLauncher({ placeholder, onPress }: SearchLauncherProps) {
  const colors = useColors();
  const { boldText, textSize, highContrast } = useSettings();
  const palette = useMaterialScheme(useColorScheme() === 'dark');
  const { width } = useWindowDimensions();
  const scale = rnTextScale(textSize);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={placeholder}
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={[styles.launcher, { width: Math.min(width, 720) - 32, backgroundColor: palette.surfaceContainerHigh }]}>
      <SearchIcon source={materialIcon('search')} />
      <Text
        allowFontScaling={scale == null}
        style={{
          color: highContrast ? colors.secondary : palette.onSurfaceVariant,
          fontSize: 17 * (scale ?? 1),
          fontWeight: boldText ? '700' : '400',
          flex: 1,
        }}>
        {placeholder}
      </Text>
    </Pressable>
  );
}

/** Dedicated search view: native editable text, Material controls, live query and standard Android Back. */
export function SearchHeader({ query, onChange, placeholder, onBack }: SearchHeaderProps) {
  const colors = useColors();
  const palette = useMaterialScheme(useColorScheme() === 'dark');
  const insets = useSafeAreaInsets();
  const { boldText, textSize, highContrast } = useSettings();
  const scale = rnTextScale(textSize);
  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: palette.surface,
      }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('search.back')}
          onPress={onBack}
          android_ripple={{ color: colors.border, borderless: true }}
          style={styles.action}>
          <SearchIcon source={require('@expo/material-symbols/arrow_back.xml')} />
        </Pressable>
        <TextInput
          autoFocus
          allowFontScaling={scale == null}
          value={query}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={highContrast ? colors.secondary : palette.onSurfaceVariant}
          accessibilityLabel={placeholder}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
          underlineColorAndroid="transparent"
          selectionColor={colors.tint}
          style={[
            styles.input,
            { color: colors.text, fontSize: 17 * (scale ?? 1), fontWeight: boldText ? '700' : '400' },
          ]}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('search.clear')}
            onPress={() => onChange('')}
            android_ripple={{ color: colors.border, borderless: true }}
            style={styles.action}>
            <SearchIcon source={materialIcon('close')} />
          </Pressable>
        ) : (
          <View style={styles.action} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  launcher: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  action: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  input: { flex: 1, minWidth: 0, minHeight: 56, fontSize: 17, paddingHorizontal: 4 },
});
