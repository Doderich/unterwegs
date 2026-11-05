import { Button, Column } from '@expo/ui';
import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useClient } from '@/auth/session';
import { queryKeys } from '@/data/queries';
import { useOnlineAction } from '@/data/useOnlineAction';
import { tr } from '@/i18n';
import { stravaAuthorizationUrl, stravaCallback } from '@/integrations/connection';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

/** Provider approval stays inside the app. The callback code is exchanged by the server using our API key. */
export default function StravaConnectScreen() {
  const client = useClient();
  const action = useOnlineAction();
  const colors = useColors();
  const [state] = useState(() => Crypto.randomUUID());
  const [failure, setFailure] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const handled = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const query = useQuery({
    queryKey: ['strava-authorization', state],
    queryFn: async () => stravaAuthorizationUrl((await client.stravaAuthorization()).auth_url, client.baseUrl, state),
    enabled: action.online,
    gcTime: 0,
    retry: false,
    meta: { persist: false },
  });
  const finish = async (code: string) => {
    if (handled.current) return;
    handled.current = true;
    setFinishing(true);
    const result = await action.run(() => client.edit.completeStrava(code), [queryKeys.integrations]);
    if (!mounted.current) return;
    setFinishing(false);
    if (result) router.back();
    else setFailure(true);
  };
  const failed = failure || query.isError || !action.online;
  return (
    <>
      <Stack.Screen options={{ title: tr('common.connectStrava') }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {query.data && !failed && !finishing ? (
          <WebView
            source={{ uri: query.data }}
            incognito
            sharedCookiesEnabled={false}
            thirdPartyCookiesEnabled={false}
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => <ActivityIndicator color={colors.tint} />}
            onError={() => setFailure(true)}
            onShouldStartLoadWithRequest={(request) => {
              const callback = stravaCallback(request.url, client.baseUrl, state);
              if (callback) {
                if ('code' in callback) void finish(callback.code);
                else setFailure(true);
                return false;
              }
              return request.url === 'about:blank' || request.url.startsWith('https://');
            }}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={styles.message}>
            <Host matchContents>
              <Column spacing={16}>
                <Text textStyle={{ color: colors.text }}>
                  {failed ? tr('common.couldNotConnectStrava') : tr('common.loading')}
                </Text>
                {failed ? <Button label={tr('integrationsStravaConnect.back')} onPress={() => router.back()} /> : null}
              </Column>
            </Host>
          </View>
        )}
      </View>
    </>
  );
}
const styles = StyleSheet.create({ message: { flex: 1, justifyContent: 'center', padding: 24 } });
