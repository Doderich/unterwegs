import { Button, Column } from '@expo/ui';
import { Map, type MapProps } from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { tr } from '@/i18n';
import { Host } from './Host';
import { Text } from './Text';
import { useColors } from './theme';
import { useScreenBackground } from './useScreenBackground';

/** Keep the native map's unrendered surface behind the app background until a complete map frame is ready. */
export function MapCanvas({
  style,
  onWillStartLoadingMap,
  onDidFinishRenderingMapFully,
  onDidFailLoadingMap,
  ...props
}: MapProps) {
  const backgroundColor = useScreenBackground();
  const colors = useColors();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  return (
    <View style={[{ flex: 1 }, style, { backgroundColor }]}>
      <Map
        {...props}
        key={attempt}
        style={StyleSheet.absoluteFill}
        onWillStartLoadingMap={(event) => {
          setPhase('loading');
          onWillStartLoadingMap?.(event);
        }}
        onDidFinishRenderingMapFully={(event) => {
          setPhase('ready');
          onDidFinishRenderingMapFully?.(event);
        }}
        onDidFailLoadingMap={(event) => {
          setPhase('failed');
          onDidFailLoadingMap?.(event);
        }}
      />
      {phase !== 'ready' ? (
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor }]}>
          {phase === 'failed' ? (
            <Host matchContents>
              <Column spacing={12}>
                <Text>{tr('map.loadFailed')}</Text>
                <Button
                  label={tr('common.tryAgain')}
                  onPress={() => {
                    setPhase('loading');
                    setAttempt((value) => value + 1);
                  }}
                />
              </Column>
            </Host>
          ) : (
            <ActivityIndicator
              accessibilityLabel={tr('map.loadingMap')}
              accessibilityState={{ busy: true }}
              color={colors.tint}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ placeholder: { alignItems: 'center', justifyContent: 'center' } });
