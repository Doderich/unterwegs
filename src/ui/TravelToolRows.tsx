import { ListItem } from '@expo/ui';
import { router } from 'expo-router';
import { tr } from '@/i18n';
import { RowIcon, type RowTheme } from './rows';

/** Shared Home and settings-directory destinations; never added to collection headers. */
export function travelToolRows(rt: RowTheme) {
  return [
    <ListItem
      key="currency"
      colors={rt.listColors}
      leading={<RowIcon name="price" />}
      onPress={() => router.push('/utilities/currency')}>
      {tr('utilities.currency')}
    </ListItem>,
    <ListItem
      key="units"
      colors={rt.listColors}
      leading={<RowIcon name="swap" />}
      onPress={() => router.push('/utilities/units')}>
      {tr('units.title')}
    </ListItem>,
    <ListItem
      key="zones"
      colors={rt.listColors}
      leading={<RowIcon name="time" />}
      onPress={() => router.push('/utilities/time-zones')}>
      {tr('timeZones.title')}
    </ListItem>,
    <ListItem
      key="essentials"
      colors={rt.listColors}
      leading={<RowIcon name="file" />}
      onPress={() => router.push('/utilities/essentials')}>
      {tr('essentials.title')}
    </ListItem>,
  ];
}
