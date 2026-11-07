import { FieldGroup, ListItem } from '@expo/ui';
import { useState, type ReactElement } from 'react';

import { tr } from '@/i18n';

import { RowIcon, type RowTheme } from './rows';
import { Sub } from './Sub';

/**
 * Detail screens show what is needed at a glance (when, where, what to know, documents) and fold the rest into one
 * "Mehr anzeigen" row. Collapsed, its second line names what is behind it, so nothing has to be remembered.
 * Returns the toggle section followed by the extra sections when open.
 */
export function useMoreSections(rt: RowTheme) {
  const [open, setOpen] = useState(false);
  return (sections: { title: string; node: ReactElement | null }[]): ReactElement[] => {
    const present = sections.filter((s) => s.node);
    if (present.length === 0) return [];
    return [
      <FieldGroup.Section key="more-toggle">
        <ListItem
          colors={rt.listColors}
          leading={<RowIcon name={open ? 'up' : 'down'} />}
          supportingText={open ? undefined : <Sub>{present.map((s) => s.title).join(' · ')}</Sub>}
          onPress={() => setOpen((o) => !o)}>
          {open ? tr('common.showFewer') : tr('common.showMore')}
        </ListItem>
      </FieldGroup.Section>,
      ...(open ? present.map((s) => s.node!) : []),
    ];
  };
}
