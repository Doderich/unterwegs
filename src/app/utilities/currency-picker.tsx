import { FieldGroup, Icon, ListItem } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Platform, View } from 'react-native';
import { useState } from 'react';
import { getLanguage, tr } from '@/i18n';
import { Host } from '@/ui/Host';
import { SearchHeader } from '@/ui/MaterialSearch';
import { androidToolbarIcon, icons } from '@/ui/icons';
import { useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Text } from '@/ui/Text';
import { initialCurrencyPair, selectCurrency } from '@/utilities/currency';
import { currencyName, currencySections } from '@/utilities/currencyCatalogue';
import { updateCurrency } from '@/utilities/currencyStore';

/** Focused native sheet with local name/code search and popular currencies above the full catalogue. */
export default function CurrencyPickerScreen() {
  const params = useLocalSearchParams<{ side?: string; base?: string; quote?: string }>();
  const pair = initialCurrencyPair(params);
  const side = params.side === 'base' ? 'base' : 'quote';
  const other = side === 'base' ? pair.quote : pair.base;
  const rt = useRowTheme();
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);
  const sections = currencySections(query, getLanguage(), [pair.base, pair.quote]);
  const row = (code: string, group: string) => (
    <ListItem
      key={`${group}-${code}`}
      colors={rt.listColors}
      supportingText={<Sub>{code === other ? tr('utilities.swapSelection', { code }) : code}</Sub>}
      trailing={
        code === pair[side] ? (
          <Icon name={icons.check} size={22} color={rt.colors.tint} />
        ) : code === other ? (
          <Icon name={icons.swap} size={22} color={rt.colors.tint} />
        ) : undefined
      }
      onPress={() => {
        try {
          updateCurrency(selectCurrency(pair, side, code));
          router.back();
        } catch {
          setError(true);
        }
      }}>
      {currencyName(code, getLanguage())}
    </ListItem>
  );
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: tr('utilities.chooseCurrency'), headerShown: Platform.OS !== 'android' }} />
      {Platform.OS === 'ios' ? (
        <>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              icon={androidToolbarIcon('close')}
              accessibilityLabel={tr('common.cancel')}
              onPress={() => router.back()}>
              {tr('common.cancel')}
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
          <Stack.SearchBar
            placement="automatic"
            hideWhenScrolling={false}
            hideNavigationBar={false}
            obscureBackground={false}
            placeholder={tr('utilities.searchCurrency')}
            onChangeText={(event) => setQuery(event.nativeEvent.text)}
            onCancelButtonPress={() => setQuery('')}
          />
        </>
      ) : (
        <SearchHeader
          query={query}
          onChange={setQuery}
          placeholder={tr('utilities.searchCurrency')}
          onBack={() => router.back()}
        />
      )}
      <Host style={{ flex: 1 }}>
        <FieldGroup>
          {error ? (
            <FieldGroup.Section>
              <Text>{tr('utilities.saveFailed')}</Text>
            </FieldGroup.Section>
          ) : null}
          {sections.popular.length ? (
            <FieldGroup.Section title={tr('utilities.popularCurrencies')}>
              {sections.popular.map((code) => row(code, 'popular'))}
            </FieldGroup.Section>
          ) : null}
          <FieldGroup.Section title={tr('utilities.allCurrencies')}>
            {sections.all.length ? (
              sections.all.map((code) => row(code, 'all'))
            ) : (
              <Text>{tr('utilities.noCurrencyFound')}</Text>
            )}
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </View>
  );
}
