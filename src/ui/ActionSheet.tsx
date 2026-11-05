import { BottomSheet, Column, Icon, ScrollView } from '@expo/ui';
import { useState, type ReactElement } from 'react';
import { useWindowDimensions } from 'react-native';

import { rnTextScale } from '@/settings/apply';
import { useSettings } from '@/settings/store';

import { icons, type IconKey } from './icons';
import { RowIcon, type RowTheme } from './rows';
import { Sub } from './Sub';
import { SheetRow } from './SheetRow';
import { Text } from './Text';

export type SheetAction = {
  label: string;
  hint?: string;
  icon?: IconKey;
  /** Marks the current choice (e.g. the selected rating). */
  checked?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Return `false` to keep the sheet open (e.g. after opening a sub-list with `open`). */
  onPress: () => void | false | Promise<unknown>;
};

/**
 * A bottom sheet with a list of actions. `open` can be called again from an action to show a sub-list
 * (e.g. "Auf anderen Tag" → list of days). Render `sheet` next to the screen's `Host`.
 */
export function useActionSheet(t: RowTheme) {
  const [content, setContent] = useState<{ title: string; actions: SheetAction[] } | null>(null);
  const open = (title: string, actions: SheetAction[]) => setContent({ title, actions });
  const close = () => setContent(null);

  const { height, fontScale } = useWindowDimensions();
  const { textSize } = useSettings();
  const scrollable = (content?.actions.length ?? 0) > 4 || (rnTextScale(textSize) ?? fontScale) > 1.3 || height < 640;
  const rows = (
    <Column spacing={0} style={{ paddingBottom: 16 }}>
      <Text
        textStyle={{ fontSize: 20, fontWeight: '600', color: t.colors.text }}
        style={{ paddingTop: 12, paddingBottom: 16 }}>
        {content?.title ?? ''}
      </Text>
      {(content?.actions ?? []).map((a, i) => (
        <SheetRow
          key={`${content?.title}-${i}`}
          testID={`sheet-action-${i}`}
          colors={{
            ...t.listColors,
            containerColor: 'transparent',
            ...(a.destructive ? { contentColor: t.colors.danger } : {}),
            ...(a.disabled ? { contentColor: t.colors.secondary } : {}),
          }}
          leading={
            a.icon ? (
              <RowIcon
                name={a.icon}
                color={a.disabled ? t.colors.secondary : a.destructive ? t.colors.danger : undefined}
              />
            ) : undefined
          }
          supportingText={a.hint ? <Sub>{a.hint}</Sub> : undefined}
          trailing={a.checked ? <Icon name={icons.check} size={20} color={t.colors.tint} /> : undefined}
          onPress={
            a.disabled
              ? undefined
              : () => {
                  const keepOpen = a.onPress();
                  if (keepOpen !== false) close();
                }
          }>
          <Text
            textStyle={{
              color: a.disabled ? t.colors.secondary : a.destructive ? t.colors.danger : t.colors.text,
            }}>
            {a.label}
          </Text>
        </SheetRow>
      ))}
    </Column>
  );
  const sheet: ReactElement = (
    <BottomSheet isPresented={!!content} onDismiss={close} snapPoints={scrollable ? ['half', 'full'] : undefined}>
      {scrollable ? <ScrollView>{rows}</ScrollView> : rows}
    </BottomSheet>
  );

  return { open, close, sheet };
}
