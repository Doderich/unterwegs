import { Button, Icon, ListItem, TextInput, useNativeState, type ObservableState, type TextInputRef } from '@expo/ui';
import { Button as SwiftButton, HStack, Menu, Spacer, ToolbarItem } from '@expo/ui/swift-ui';
import { accessibilityIdentifier, labelStyle } from '@expo/ui/swift-ui/modifiers';
import { useRef, useState, type ReactElement } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { tr } from '@/i18n';

import { fromGraphemeOffset, toGraphemeOffset } from './graphemes';
import { Host } from './Host';
import { icons, sfSymbol, type IconKey } from './icons';
import { formatMarkdown, type MarkdownCommand, type TextSelection } from './markdownEditing';
import { markdownRows, RowIcon, type RowTheme } from './rows';
import { Text } from './Text';

const IOS = Platform.OS === 'ios';

type Command = { command: MarkdownCommand; icon: IconKey; label: string; rare?: boolean };

function commands(): Command[] {
  return [
    { command: 'bold', icon: 'bold', label: tr('markdownField.bold') },
    { command: 'italic', icon: 'italic', label: tr('markdownField.italic') },
    { command: 'heading', icon: 'heading', label: tr('markdownField.heading'), rare: true },
    { command: 'list', icon: 'bulletList', label: tr('markdownField.bulletedList'), rare: true },
    { command: 'link', icon: 'link', label: tr('markdownField.link') },
  ];
}

/**
 * Markdown text edited where it is shown: formatted at rest, a labelled action turns the same section into a native
 * text field with a formatting bar above the keyboard. Typing only changes the form's draft; `Fertig` returns to the
 * formatted view, and the form's own save action persists. Used through `useMarkdownEditor`.
 *
 * Returns the section rows and the keyboard bar for `<FormHost keyboardBar>`.
 */
export function useMarkdownField(
  t: RowTheme,
  value: string,
  onChange: (text: string) => void,
  { placeholder }: { placeholder: string },
) {
  const [editing, setEditing] = useState(false);
  const [more, setMore] = useState(false);
  const state = useNativeState(value);
  const text = useRef(value);
  /** Last selection in the native field's units (UTF-16 on Android, Swift Characters on iOS). */
  const selection = useRef<TextSelection>({ start: value.length, end: value.length });
  const input = useRef<TextInputRef>(null);
  /** The native field reports a blur when it mounts unfocused; only a blur after real focus ends editing. */
  const hadFocus = useRef(false);
  /** iOS: selection to apply once the field has taken over text set from JS (see `format`). */
  const pending = useRef<TextSelection | null>(null);
  const all = commands();
  // Heading and list sit under "…" (decided in #10), so the bar fits narrow screens and large text.
  const overflow = true;

  const start = () => {
    text.current = value;
    write(state, value);
    const end = IOS ? toGraphemeOffset(value, value.length) : value.length;
    selection.current = { start: end, end };
    setMore(false);
    hadFocus.current = false;
    setEditing(true);
  };
  const finish = () => {
    input.current?.blur();
    setEditing(false);
  };
  const format = (command: MarkdownCommand) => {
    const raw = selection.current;
    const utf16 = IOS
      ? { start: fromGraphemeOffset(text.current, raw.start), end: fromGraphemeOffset(text.current, raw.end) }
      : raw;
    const result = formatMarkdown(text.current, utf16, command, tr('common.text'));
    text.current = result.text;
    write(state, result.text);
    onChange(result.text);
    const { start: s, end: e } = result.selection;
    const native = IOS
      ? { start: toGraphemeOffset(result.text, s), end: toGraphemeOffset(result.text, e) }
      : result.selection;
    selection.current = native;
    if (IOS) {
      // The SwiftUI field clamps a selection to the text it has *now*, and drops it once text set from JS
      // arrives. That arrival reports a caret at the new end: apply the selection then (fallback: a timer).
      pending.current = native;
      setTimeout(() => applyPending(), 400);
    } else {
      requestAnimationFrame(() => void input.current?.setSelection(native.start, native.end));
    }
  };
  const applyPending = () => {
    const target = pending.current;
    if (!target) return;
    pending.current = null;
    void input.current?.setSelection(target.start, target.end);
  };

  const rows: ReactElement[] = editing
    ? [
        <TextInput
          key="input"
          ref={input}
          testID="markdown-field-input"
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          multiline
          autoFocus
          value={state}
          onChangeText={(next) => {
            text.current = next;
            onChange(next);
          }}
          onSelectionChange={(s) => {
            // Stored as reported (iOS: Swift Characters). The new selection can arrive before the new text, so
            // it's converted to UTF-16 only when a command runs.
            if (pending.current) {
              applyPending();
              return;
            }
            selection.current = s;
          }}
          onFocus={() => {
            if (hadFocus.current) return;
            hadFocus.current = true;
            // Continue writing at the end (Android starts the caret at 0). On iOS only once focus has settled:
            // a selection set during the focus change stops later programmatic selections from applying.
            const place = () => {
              const end = IOS ? toGraphemeOffset(text.current, text.current.length) : text.current.length;
              selection.current = { start: end, end };
              void input.current?.setSelection(end, end);
            };
            if (IOS) setTimeout(place, 300);
            else place();
          }}
          onBlur={() => {
            if (hadFocus.current) setEditing(false);
          }}
        />,
      ]
    : [
        // The same rows as the detail screens, so links are tappable link rows here too.
        ...(value.trim()
          ? markdownRows(t, value, 'md')
          : [
              <Text key="empty" textStyle={{ color: t.colors.secondary }}>
                {tr('markdownField.noTextYet')}
              </Text>,
            ]),
        <ListItem
          key="edit"
          testID="markdown-field-edit"
          colors={t.listColors}
          leading={<RowIcon name="edit" />}
          onPress={start}>
          {value.trim() ? tr('markdownField.editText') : tr('markdownField.addText')}
        </ListItem>,
      ];

  if (!editing) return { rows, keyboardBar: null };

  const visible = overflow && !IOS ? (more ? all.filter((c) => c.rare) : all.filter((c) => !c.rare)) : all;

  const keyboardBar = IOS ? (
    <ToolbarItem placement="keyboard">
      <HStack spacing={4}>
        {(overflow ? all.filter((c) => !c.rare) : all).map((c) => (
          <SwiftButton
            key={c.command}
            label={c.label}
            systemImage={sfSymbol(c.icon) as never}
            modifiers={[labelStyle('iconOnly'), accessibilityIdentifier(`markdown-${c.command}`)]}
            onPress={() => format(c.command)}
          />
        ))}
        {overflow ? (
          <Menu
            label={tr('markdownField.moreFormats')}
            systemImage="ellipsis.circle"
            modifiers={[labelStyle('iconOnly')]}>
            {all
              .filter((c) => c.rare)
              .map((c) => (
                <SwiftButton
                  key={c.command}
                  label={c.label}
                  systemImage={sfSymbol(c.icon) as never}
                  onPress={() => format(c.command)}
                />
              ))}
          </Menu>
        ) : null}
        <Spacer />
        <SwiftButton
          label={tr('common.done')}
          modifiers={[accessibilityIdentifier('markdown-done')]}
          onPress={finish}
        />
      </HStack>
    </ToolbarItem>
  ) : (
    <View style={[styles.bar, { borderTopColor: t.colors.border, backgroundColor: t.colors.background }]}>
      <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
        {visible.map((c) => (
          <BarButton key={c.command} id={c.command} onPress={() => format(c.command)}>
            <Icon name={icons[c.icon]} size={24} color={t.colors.tint} accessibilityLabel={c.label} />
          </BarButton>
        ))}
        {overflow ? (
          <BarButton id="more" onPress={() => setMore((m) => !m)}>
            <Icon
              name={icons[more ? 'close' : 'more']}
              size={24}
              color={t.colors.tint}
              accessibilityLabel={more ? tr('markdownField.backBoldItalicLink') : tr('markdownField.moreFormats')}
            />
          </BarButton>
        ) : null}
      </ScrollView>
      <BarButton id="done" onPress={finish}>
        <Text textStyle={{ color: t.colors.tint, fontWeight: '600' }}>{tr('common.done')}</Text>
      </BarButton>
    </View>
  );

  return { rows, keyboardBar };
}

/** One Material text button in its own small Compose host, so the RN bar can lay them out and scroll. */
function BarButton({ id, onPress, children }: { id: string; onPress: () => void; children: ReactElement }) {
  return (
    <Host matchContents={{ horizontal: true }} style={styles.buttonHost} ignoreSafeArea="all">
      <Button testID={`markdown-${id}`} variant="text" onPress={onPress}>
        {children}
      </Button>
    </Host>
  );
}

/** The native text state is written imperatively (its documented API); kept out of render-tracked code. */
function write<T>(state: ObservableState<T>, value: T) {
  state.value = value;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  buttonHost: { height: 52 },
});
