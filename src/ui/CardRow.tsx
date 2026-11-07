import { RNHostView } from '@expo/ui';
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScaledText } from './ScaledText';
import { useColors } from './theme';
import { typeScale } from './typeScale';

/** Card width inside `RefreshableFieldGroup` (16 dp content padding on Android). */
export const cardRowWidth = (windowWidth: number): number | undefined => windowWidth - 32;

/**
 * A React Native card shown edge to edge between sections. Needs `RefreshableFieldGroup` on Android
 * (`FieldGroup` would wrap it in a padded row).
 */
export function CardRow({ children, title }: { children: ReactElement; title?: string }) {
  if (!title) return <RNHostView matchContents>{children}</RNHostView>;
  return (
    <RNHostView matchContents>
      <View style={styles.titled}>
        <CardTitle title={title} />
        {children}
      </View>
    </RNHostView>
  );
}

/** The section heading above a card, in the list's own header style. */
function CardTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <ScaledText accessibilityRole="header" style={{ ...typeScale.label, fontWeight: '600', color: colors.secondary }}>
      {title}
    </ScaledText>
  );
}

const styles = StyleSheet.create({ titled: { gap: 8 } });
