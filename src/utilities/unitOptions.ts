import { tr } from '@/i18n';
import type { UnitGroup } from './units';

export function unitOptions(group: UnitGroup) {
  switch (group) {
    case 'temperature':
      return [
        { value: 'c', label: '°C' },
        { value: 'f', label: '°F' },
      ];
    case 'distance':
      return ['km', 'mi', 'm', 'ft'].map((u) => ({ value: u, label: u }));
    case 'weight':
      return ['kg', 'lb', 'g', 'oz'].map((u) => ({ value: u, label: u }));
    case 'volume':
      return [
        { value: 'l', label: 'L' },
        { value: 'ml', label: 'mL' },
        { value: 'usGal', label: tr('units.usGallon') },
        { value: 'impGal', label: tr('units.imperialGallon') },
      ];
  }
}
