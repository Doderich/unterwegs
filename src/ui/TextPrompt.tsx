import { BottomSheet, Button, Column } from '@expo/ui';
import { useState, type ReactElement } from 'react';
import { Platform } from 'react-native';
import { frame, tint } from '@expo/ui/swift-ui/modifiers';

import { tr } from '@/i18n';

import type { RowTheme } from './rows';
import { Text } from './Text';
import { TextInput } from '@/ui/TextInput';

type Prompt = { title: string; value: string; placeholder?: string; onSave: (value: string) => unknown };

/**
 * A small sheet with one text field and "Sichern", for renaming (a checklist item, an attachment).
 * `Alert.prompt` would be iOS-only. Render `sheet` next to the screen's `Host`.
 */
export function useTextPrompt(t: RowTheme) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [text, setText] = useState('');

  const open = (p: Prompt) => {
    setText(p.value);
    setPrompt(p);
  };
  const close = () => setPrompt(null);
  const save = () => {
    const value = text.trim();
    if (!prompt || !value) return;
    const onSave = prompt.onSave;
    close();
    if (value !== prompt.value) void onSave(value);
  };

  const sheet: ReactElement = (
    <BottomSheet
      isPresented={!!prompt}
      onDismiss={close}
      snapPoints={Platform.OS === 'ios' ? undefined : ['half']}
      modifiers={Platform.OS === 'ios' ? [tint(t.colors.tint)] : undefined}>
      <Column
        spacing={Platform.OS === 'ios' ? 16 : 12}
        style={Platform.OS === 'ios' ? { paddingTop: 8, paddingBottom: 16 } : { padding: 16 }}>
        <Text textStyle={{ fontSize: 20, fontWeight: '600', color: t.colors.text }}>{prompt?.title ?? ''}</Text>
        {prompt ? (
          <TextInput
            key={prompt.title + prompt.value}
            defaultValue={prompt.value}
            onChangeText={setText}
            placeholder={prompt.placeholder}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
          />
        ) : null}
        <Button
          label={tr('common.save')}
          variant={Platform.OS === 'ios' ? 'text' : 'filled'}
          style={Platform.OS === 'ios' ? { paddingHorizontal: 12 } : undefined}
          modifiers={Platform.OS === 'ios' ? [frame({ minHeight: 44 })] : undefined}
          onPress={save}>
          {Platform.OS === 'ios' ? (
            <Text textStyle={{ color: t.colors.tint, fontWeight: '600' }}>{tr('common.save')}</Text>
          ) : undefined}
        </Button>
      </Column>
    </BottomSheet>
  );

  return { open, close, sheet };
}
