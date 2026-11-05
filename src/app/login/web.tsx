import { Button, Column } from '@expo/ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { deviceKeyName, isBackOnWebsite, ssoKeyScript } from '@/auth/serverLogin';
import { useSession } from '@/auth/session';
import { tr } from '@/i18n';
import { serverCompatText } from '@/api/errors';
import { haptics } from '@/settings/haptics';
import { toolbarIcon } from '@/ui/icons';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

/** How long the key may take once the WebView is back on the website. */
const FINISH_TIMEOUT_MS = 20_000;

type Failure = 'load' | 'key' | 'timeout';

/**
 * SSO in an incognito WebView: the user logs in on the website (Authentik etc.); once the WebView is
 * back on the logged-in website, an injected script creates this device's API key. A cover hides the
 * blank first load and the website itself while the key is being made, so the user only ever sees
 * the identity provider's pages.
 */
export default function WebLoginScreen() {
  const { url, server, name } = useLocalSearchParams<{ url: string; server: string; name?: string }>();
  const { signIn } = useSession();
  const colors = useColors();
  const web = useRef<WebView<object>>(null);
  // Bumped by "Erneut versuchen": remounts the WebView, which starts over at the provider URL.
  const [attempt, setAttempt] = useState(0);
  const [firstLoad, setFirstLoad] = useState(true);
  const [onWebsite, setOnWebsite] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  /** The server signed in but can't be read by the app (unsupported version): shown instead of the generic text. */
  const [compatText, setCompatText] = useState<string | null>(null);
  const done = useRef(false);

  const covered = !failure && (firstLoad || onWebsite || finishing);
  const busy = !failure && (onWebsite || finishing);

  // The key script normally answers within a second; don't leave the user behind a spinner forever.
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => fail('timeout'), FINISH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  function fail(kind: Failure) {
    if (done.current) return;
    haptics.error();
    setFailure(kind);
  }

  function retry() {
    done.current = false;
    setFailure(null);
    setCompatText(null);
    setFirstLoad(true);
    setOnWebsite(false);
    setFinishing(false);
    setAttempt((n) => n + 1);
  }

  function onNavigation(nav: WebViewNavigation) {
    if (!nav.loading) setFirstLoad(false);
    const back = isBackOnWebsite(nav.url, server);
    setOnWebsite(back);
    if (back && !nav.loading && !done.current) {
      web.current?.injectJavaScript(ssoKeyScript(deviceKeyName()));
    }
  }

  async function onMessage(e: WebViewMessageEvent) {
    // Only the injected script on the signed-in website may hand over a key, not the provider or another page.
    if (done.current || !isBackOnWebsite(e.nativeEvent.url, server)) return;
    let message: { key?: string; error?: string; signedOut?: boolean };
    try {
      message = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (message.signedOut) {
      // On the website but not logged in: show it, the user continues there.
      setOnWebsite(false);
      return;
    }
    if (!message.key) {
      fail('key');
      return;
    }
    done.current = true;
    setFinishing(true);
    try {
      await signIn({ serverUrl: server, apiKey: message.key });
      haptics.success();
      if (router.canGoBack()) router.back();
    } catch (e) {
      done.current = false;
      setFinishing(false);
      setCompatText(serverCompatText(e));
      fail('key');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* No swipe-to-dismiss while the key is being created: it would leave a key without a device. */}
      <Stack.Screen
        options={{ title: name ? tr('common.signInWithName', { name }) : tr('common.signIn'), gestureEnabled: !busy }}
      />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={toolbarIcon('close') as never}
          accessibilityLabel={tr('common.cancel')}
          disabled={finishing}
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      {failure ? (
        <Host style={{ flex: 1 }}>
          <Column spacing={16} alignment="center" style={{ padding: 24 }}>
            <Text textStyle={{ fontSize: 17, textAlign: 'center', color: colors.text }}>
              {failure === 'load'
                ? tr('loginWeb.signinPageWontLoadPlease')
                : failure === 'timeout'
                  ? tr('loginWeb.serverIsntRespondingPleaseTry')
                  : (compatText ?? tr('common.signingInWorkedButServer'))}
            </Text>
            <Button label={tr('common.tryAgain')} onPress={retry} />
          </Column>
        </Host>
      ) : (
        <WebView<object>
          key={attempt}
          ref={web}
          source={{ uri: url }}
          originWhitelist={['https://*']}
          // HTTPS pages only; other schemes (tel:, intent:, custom app links) never open from the sign-in page.
          onShouldStartLoadWithRequest={(r) => /^(https:\/\/|about:)/i.test(r.url)}
          incognito
          sharedCookiesEnabled={false}
          // Links that open a new window (e.g. "Passwort vergessen") stay in this view.
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          onNavigationStateChange={onNavigation}
          onMessage={(e) => void onMessage(e)}
          onError={(e) => {
            // Errors on sub-frames or cancelled redirects aren't a failed page.
            if (e.nativeEvent.code !== -999) fail('load');
          }}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 500) fail('load');
          }}
          // iOS may kill the web process in the background; reload instead of showing a blank page.
          onContentProcessDidTerminate={() => web.current?.reload()}
          style={styles.web}
        />
      )}
      {covered ? (
        <View style={[styles.cover, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.tint} />
          {firstLoad ? null : (
            <Text textStyle={{ fontSize: 15, color: colors.secondary }}>{tr('loginWeb.finishingSignin')}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
  cover: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
