import { Button, FieldGroup, ListItem } from '@expo/ui';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { AuthError, normalizeServerUrl } from '@/api/client';
import { DEFAULT_SERVER_URL } from '@/auth/keyStore';
import { serverCompatText } from '@/api/errors';
import { signInWithBrowser } from '@/auth/browserLogin';
import { confirmMfa, fetchLoginOptions, LoginError, passwordLogin, supportsBrowserLogin } from '@/auth/serverLogin';
import { useSession } from '@/auth/session';
import { tr } from '@/i18n';
import { FormHost } from '@/ui/FormHost';
import { typeScale } from '@/ui/typeScale';
import { useInitialInputFocus } from '@/ui/useInitialInputFocus';
import { haptics } from '@/settings/haptics';
import { Sub } from '@/ui/Sub';
import { RowIcon } from '@/ui/rows';
import { useColors, useListColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';
import { WideButton } from '@/ui/WideButton';

const DEMO_SERVER_URL = 'https://demo.adventurelog.app';

/**
 * Every path ends in an API key for this device: SSO (WebView), username + password (when the server
 * allows it), the website's QR code, or a pasted key.
 */
export default function LoginScreen() {
  const listColors = useListColors();
  const { signIn } = useSession();
  const colors = useColors();
  // Typed values live here and in the native fields; state only tracks what the screen shows (empty or not), so
  // typing doesn't re-render the screen.
  const values = useRef({ server: DEFAULT_SERVER_URL, username: '', password: '', code: '', apiKey: '' });
  const [filled, setFilled] = useState({
    server: !!DEFAULT_SERVER_URL.trim(),
    username: false,
    password: false,
    code: false,
    apiKey: false,
  });
  // What a field shows when it mounts again (after Change server, MFA Cancel or reopening Advanced).
  const [initial, setInitial] = useState({ server: DEFAULT_SERVER_URL, username: '', apiKey: '' });
  function setValue(field: keyof typeof values.current, text: string) {
    values.current[field] = text;
    const has = field === 'password' ? text.length > 0 : !!text.trim();
    setFilled((f) => (f[field] === has ? f : { ...f, [field]: has }));
  }
  const [server, setServer] = useState('');
  const [serverError, setServerError] = useState<'invalid' | 'insecure' | false>(false);
  const [advanced, setAdvanced] = useState(false);
  const options = useQuery({
    queryKey: ['loginOptions', server],
    queryFn: () => fetchLoginOptions(server),
    enabled: !!server,
    retry: false,
    gcTime: 0,
    meta: { persist: false },
    networkMode: 'online',
  });
  // Servers with `server/unterwegs-login.html` sign in through the browser sheet (passkeys work).
  const browserLogin = useQuery({
    queryKey: ['browserLogin', server],
    queryFn: () => supportsBrowserLogin(server),
    enabled: !!server,
    retry: false,
    gcTime: 0,
    meta: { persist: false },
    networkMode: 'online',
  });

  const [mfa, setMfa] = useState<{ sessionToken: string } | null>(null);
  const mfaFocus = useInitialInputFocus(!!mfa);
  const [busy, setBusy] = useState<'sso' | 'password' | 'key' | null>(null);
  const [error, setError] = useState<{ section: 'sso' | 'password' | 'key'; text: string } | null>(null);

  function commitServer() {
    const next = normalizeServerUrl(values.current.server);
    // The API key travels in a header: never over plain HTTP.
    if (/^http:\/\//i.test(next)) {
      setServerError('insecure');
      return;
    }
    try {
      const url = new URL(next);
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash) {
        throw new Error('Invalid server URL');
      }
    } catch {
      setServerError('invalid');
      return;
    }
    Keyboard.dismiss();
    setServerError(false);
    setInitial((i) => ({ ...i, server: values.current.server }));
    setServer(next);
  }

  function changeServer() {
    if (busy) return;
    setServer('');
    for (const field of ['username', 'password', 'code', 'apiKey'] as const) setValue(field, '');
    setInitial((i) => ({ ...i, username: '', apiKey: '' }));
    setMfa(null);
    setAdvanced(false);
    setError(null);
  }

  async function finish(key: string) {
    await signIn({ serverUrl: server, apiKey: key });
  }

  async function signInWithProvider(provider: { name: string; url: string }) {
    if (busy) return;
    setBusy('sso');
    setError(null);
    try {
      const browser = browserLogin.isPending ? await supportsBrowserLogin(server) : browserLogin.data;
      if (!browser) {
        router.push({ pathname: '/login/web', params: { url: provider.url, server, name: provider.name } });
        return;
      }
      const key = await signInWithBrowser(provider.url, browser);
      if (key) {
        await finish(key);
        haptics.success();
      }
    } catch (e) {
      haptics.error();
      setError({
        section: 'sso',
        text: e instanceof LoginError ? e.message : (serverCompatText(e) ?? tr('common.cantReachServer')),
      });
    } finally {
      setBusy(null);
    }
  }

  async function submitPassword() {
    const { username, password, code } = values.current;
    if (busy || (mfa ? !code.trim() : !username.trim() || !password)) return;
    setBusy('password');
    setError(null);
    try {
      if (mfa) {
        await finish(await confirmMfa(server, mfa.sessionToken, code));
        return;
      }
      const result = await passwordLogin(server, username, password);
      if (result.status === 'mfa') {
        setInitial((i) => ({ ...i, username }));
        setMfa({ sessionToken: result.sessionToken });
      } else await finish(result.apiKey);
    } catch (e) {
      setError({
        section: 'password',
        text: e instanceof LoginError ? e.message : (serverCompatText(e) ?? tr('common.cantReachServer')),
      });
    } finally {
      setBusy(null);
    }
  }

  async function submitKey() {
    const { apiKey } = values.current;
    if (!apiKey.trim() || busy) return;
    setBusy('key');
    setError(null);
    try {
      await signIn({ serverUrl: server, apiKey });
    } catch (e) {
      setError({
        section: 'key',
        text:
          e instanceof AuthError ? tr('login.invalidApiKey') : (serverCompatText(e) ?? tr('common.cantReachServer')),
      });
    } finally {
      setBusy(null);
    }
  }

  const providers = options.data?.providers ?? [];
  const showPassword = options.data?.passwordAllowed ?? false;
  const errorFooter = (section: 'sso' | 'password' | 'key') =>
    error?.section === section ? (
      <FieldGroup.SectionFooter>
        <Text textStyle={{ color: colors.danger }}>{error.text}</Text>
      </FieldGroup.SectionFooter>
    ) : null;

  // Shown where a missing or self-made certificate ends up: an http:// address or an unreachable server.
  const httpsHelpButton = (
    <Button label={tr('login.httpsHelp')} variant="text" onPress={() => router.push('/login/https-help')} />
  );

  const qrRow = (
    <ListItem
      colors={listColors}
      leading={<RowIcon name="qr" />}
      supportingText={<Sub>{tr('login.websiteMenuPhoneSignin')}</Sub>}
      onPress={busy ? undefined : () => router.push('/login/scan')}>
      {tr('login.scanQrCode')}
    </ListItem>
  );

  if (!server) {
    return (
      <FormHost>
        <FieldGroup>
          <FieldGroup.Section title={tr('login.adventurelogServer')}>
            <TextInput
              defaultValue={initial.server}
              onChangeText={(value) => {
                setValue('server', value);
                setServerError(false);
              }}
              onSubmitEditing={commitServer}
              placeholder="https://adventurelog.example.org"
              accessibilityLabel={tr('login.serverAddress')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
            />
            <WideButton label={tr('login.continue')} disabled={!filled.server} onPress={commitServer} />
            <FieldGroup.SectionFooter>
              <Text textStyle={{ ...typeScale.label, color: serverError ? colors.danger : colors.secondary }}>
                {serverError === 'insecure'
                  ? tr('login.serverNeedsHttps')
                  : serverError
                    ? tr('login.enterValidServerAddress')
                    : tr('login.enterServerWebsiteAddress')}
              </Text>
              {httpsHelpButton}
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
          <FieldGroup.Section>{qrRow}</FieldGroup.Section>
          <FieldGroup.Section>
            <ListItem
              colors={listColors}
              leading={<RowIcon name="world" />}
              supportingText={<Sub>{tr('login.publicDemoDescription')}</Sub>}
              onPress={() => {
                Keyboard.dismiss();
                setServerError(false);
                setValue('server', DEMO_SERVER_URL);
                setInitial((i) => ({ ...i, server: DEMO_SERVER_URL }));
                setServer(DEMO_SERVER_URL);
              }}>
              {tr('login.tryPublicDemo')}
            </ListItem>
            <FieldGroup.SectionFooter>
              <Text textStyle={{ ...typeScale.label, color: colors.secondary }}>{tr('login.publicDemoNotice')}</Text>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>
        </FieldGroup>
      </FormHost>
    );
  }

  return (
    <FormHost>
      <FieldGroup>
        <FieldGroup.Section title={tr('common.server')}>
          <ListItem colors={listColors} leading={<RowIcon name="world" />} supportingText={<Sub>{server}</Sub>}>
            {server === DEMO_SERVER_URL ? tr('login.publicDemo') : tr('login.adventurelogServer')}
          </ListItem>
          <Button label={tr('login.changeServer')} variant="text" disabled={!!busy} onPress={changeServer} />
          {server === DEMO_SERVER_URL ? (
            <FieldGroup.SectionFooter>
              <Text textStyle={{ ...typeScale.label, color: colors.secondary }}>{tr('login.publicDemoNotice')}</Text>
            </FieldGroup.SectionFooter>
          ) : null}
        </FieldGroup.Section>

        <FieldGroup.Section title={tr('common.signIn')}>
          {providers.map((p) => (
            <ListItem
              key={p.url}
              colors={listColors}
              leading={<RowIcon name="key" />}
              supportingText={<Sub>{tr('login.sameAsOnWebsite')}</Sub>}
              onPress={busy ? undefined : () => void signInWithProvider(p)}>
              {busy === 'sso' ? tr('login.signingIn') : tr('common.signInWithName', { name: p.name })}
            </ListItem>
          ))}
          {options.isSuccess && providers.length === 0 ? (
            <ListItem
              colors={listColors}
              leading={<RowIcon name="key" />}
              supportingText={<Sub>{tr('login.websitesSigninPage')}</Sub>}
              onPress={
                busy
                  ? undefined
                  : () => router.push({ pathname: '/login/web', params: { url: `${server}/login`, server } })
              }>
              {tr('login.signInInBrowser')}
            </ListItem>
          ) : null}
          {qrRow}
          {errorFooter('sso') ??
            // Without the sign-in page, SSO runs in a WebView, where passkeys fail: say so before the user gets stuck.
            (providers.length > 0 && browserLogin.isSuccess && !browserLogin.data ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ ...typeScale.label, color: colors.secondary }}>{tr('login.passkeyHint')}</Text>
              </FieldGroup.SectionFooter>
            ) : null) ??
            (options.isPaused ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ ...typeScale.label, color: colors.secondary }}>{tr('login.connectToInternet')}</Text>
              </FieldGroup.SectionFooter>
            ) : options.isPending ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ ...typeScale.label, color: colors.secondary }}>
                  {tr('login.checkingSigninOptions')}
                </Text>
              </FieldGroup.SectionFooter>
            ) : options.isError ? (
              <FieldGroup.SectionFooter>
                <Text textStyle={{ ...typeScale.label, color: colors.danger }}>
                  {options.error instanceof LoginError ? options.error.message : tr('common.cantReachServer')}
                </Text>
                <Button label={tr('common.tryAgain')} variant="text" onPress={() => void options.refetch()} />
                {httpsHelpButton}
              </FieldGroup.SectionFooter>
            ) : null)}
        </FieldGroup.Section>

        {showPassword ? (
          <FieldGroup.Section title={tr('login.withUsername')}>
            {mfa ? (
              <TextInput
                key="totp"
                onChangeText={(text) => setValue('code', text)}
                placeholder={tr('login.codeFromAuthenticatorApp')}
                accessibilityLabel={tr('login.codeFromAuthenticatorApp')}
                editable={!busy}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                {...mfaFocus}
                onSubmitEditing={() => void submitPassword()}
              />
            ) : (
              [
                <TextInput
                  key="user"
                  defaultValue={initial.username}
                  onChangeText={(text) => setValue('username', text)}
                  placeholder={tr('login.usernameOrEmail')}
                  accessibilityLabel={tr('login.usernameOrEmail')}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                />,
                <TextInput
                  key="password"
                  onChangeText={(text) => setValue('password', text)}
                  placeholder={tr('common.password')}
                  accessibilityLabel={tr('common.password')}
                  editable={!busy}
                  secureTextEntry
                  autoComplete="password"
                  onSubmitEditing={() => void submitPassword()}
                />,
              ]
            )}
            <WideButton
              label={busy === 'password' ? tr('login.signingIn') : mfa ? tr('login.confirm') : tr('common.signIn')}
              disabled={!!busy || (mfa ? !filled.code : !filled.username || !filled.password)}
              onPress={() => void submitPassword()}
            />
            {mfa ? (
              <Button
                label={tr('common.cancel')}
                variant="text"
                disabled={!!busy}
                onPress={() => {
                  setMfa(null);
                  setValue('code', '');
                  setValue('password', '');
                  setError(null);
                }}
              />
            ) : null}
            {errorFooter('password')}
          </FieldGroup.Section>
        ) : null}

        <FieldGroup.Section title={tr('login.advanced')}>
          <Button
            label={advanced ? tr('login.hideApiKey') : tr('login.signInWithApiKey')}
            variant="text"
            disabled={!!busy}
            onPress={() => {
              if (advanced) setInitial((i) => ({ ...i, apiKey: values.current.apiKey }));
              setAdvanced(!advanced);
            }}
          />
          {advanced ? (
            <>
              <TextInput
                onChangeText={(text) => setValue('apiKey', text)}
                defaultValue={initial.apiKey}
                placeholder={tr('login.apiKey')}
                accessibilityLabel={tr('login.apiKey')}
                editable={!busy}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                onSubmitEditing={() => void submitKey()}
              />
              <WideButton
                label={busy === 'key' ? tr('login.checking') : tr('common.signIn')}
                disabled={!!busy || !filled.apiKey}
                onPress={() => void submitKey()}
              />
              {errorFooter('key') ?? (
                <FieldGroup.SectionFooter>
                  <Text textStyle={{ ...typeScale.label, color: colors.secondary }}>
                    {tr('login.websiteSettingsApiKeysOnly')}
                  </Text>
                </FieldGroup.SectionFooter>
              )}
            </>
          ) : null}
        </FieldGroup.Section>
      </FieldGroup>
    </FormHost>
  );
}
