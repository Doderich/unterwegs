import { FieldGroup, ListItem } from '@expo/ui';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import {
  activateTotp,
  addEmail,
  changePassword,
  confirmUnlock,
  deactivateTotp,
  lock,
  listEmails,
  makePrimaryEmail,
  newRecoveryCodes,
  recoveryCodes,
  removeEmail,
  resendVerification,
  SecurityError,
  startTotp,
  totpLink,
  twoFactorState,
  unlock,
  type EmailAddress,
  type SecuritySession,
  type TwoFactorState,
} from '@/auth/accountSecurity';
import { useCredentials } from '@/auth/session';
import { useUser } from '@/data/queries';
import { useOnline } from '@/data/useOnlineAction';
import { haptics } from '@/settings/haptics';
import { tr } from '@/i18n';
import { useActionSheet } from '@/ui/ActionSheet';
import { FormHost } from '@/ui/FormHost';
import { copyRow, RowIcon, useCopy, useRowTheme } from '@/ui/rows';
import { Sub } from '@/ui/Sub';
import { Text } from '@/ui/Text';
import { TextInput } from '@/ui/TextInput';
import { useTextPrompt } from '@/ui/TextPrompt';

type Phase = { step: 'locked' } | { step: 'mfa'; pending: SecuritySession } | { step: 'open'; session: SecuritySession };

/**
 * Password, two-factor sign-in and email addresses, in the app (allauth through a short session of its own, see
 * `src/auth/accountSecurity.ts`). Opens with the account password; the session ends when the screen closes.
 */
export default function AccountSecurityScreen() {
  const credentials = useCredentials();
  const user = useUser();
  const online = useOnline();
  const rt = useRowTheme();
  const copy = useCopy();
  const sheet = useActionSheet(rt);
  const prompt = useTextPrompt(rt);

  const [phase, setPhase] = useState<Phase>({ step: 'locked' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // The password typed to open the screen: also the "current password" a change needs. Memory only.
  const password = useRef('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [emails, setEmails] = useState<EmailAddress[] | null>(null);
  const [twoFactor, setTwoFactor] = useState<TwoFactorState | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);

  const session = phase.step === 'open' ? phase.session : null;
  const sessionRef = useRef<SecuritySession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  // Leaving the screen ends the session.
  useEffect(() => () => void (sessionRef.current && lock(sessionRef.current)), []);

  const fail = useCallback((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    if (e instanceof SecurityError && e.expired) {
      password.current = '';
      setPhase({ step: 'locked' });
      setFormKey((k) => k + 1);
    }
    haptics.error();
    Alert.alert(tr('common.notAvailable'), message);
  }, []);

  /** Runs one request with the open session; an ended session goes back to the password step. */
  const run = async <R,>(request: (s: SecuritySession) => Promise<R>): Promise<R | null> => {
    if (!session || busy) return null;
    setBusy(true);
    try {
      return await request(session);
    } catch (e) {
      fail(e);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const load = useCallback(
    async (s: SecuritySession) => {
      try {
        const [list, state] = await Promise.all([listEmails(s), twoFactorState(s)]);
        setEmails(list);
        setTwoFactor(state);
      } catch (e) {
        fail(e);
      }
    },
    [fail],
  );

  const opened = (s: SecuritySession) => {
    setPhase({ step: 'open', session: s });
    setCode('');
    void load(s);
  };

  const submitPassword = async () => {
    if (!credentials || !user.data || !password.current || busy) return;
    setBusy(true);
    try {
      const result = await unlock(credentials.serverUrl, user.data.username, password.current);
      if (result.status === 'ok') opened(result.session);
      else setPhase({ step: 'mfa', pending: result.pending });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (phase.step !== 'mfa' || !code.trim() || busy) return;
    setBusy(true);
    try {
      opened(await confirmUnlock(phase.pending, code));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (newPassword !== repeat) {
      Alert.alert(tr('common.notAvailable'), tr('accountSecurity.passwordsDontMatch'));
      return;
    }
    const done = await run(async (s) => {
      await changePassword(s, password.current, newPassword);
      return true;
    });
    if (!done) return;
    password.current = newPassword;
    setNewPassword('');
    setRepeat('');
    setFormKey((k) => k + 1);
    haptics.success();
    setNotice(tr('accountSecurity.passwordChanged'));
  };

  const beginTotp = async () => {
    const secret = await run(startTotp);
    if (secret) setTotpSecret(secret);
  };

  const finishTotp = async () => {
    const result = await run(async (s) => {
      await activateTotp(s, code);
      // allauth makes recovery codes with the first authenticator; show them once.
      const [state, list] = await Promise.all([twoFactorState(s), recoveryCodes(s).catch(() => [])]);
      return { state, list };
    });
    if (!result) return;
    haptics.success();
    setTotpSecret(null);
    setCode('');
    setTwoFactor(result.state);
    setCodes(result.list.length ? result.list : null);
  };

  const turnOffTotp = () =>
    Alert.alert(tr('accountSecurity.turnOffConfirm'), tr('accountSecurity.turnOffBody'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('accountSecurity.turnOff'),
        style: 'destructive',
        onPress: async () => {
          const state = await run(async (s) => {
            await deactivateTotp(s);
            return twoFactorState(s);
          });
          if (state) {
            setTwoFactor(state);
            setCodes(null);
          }
        },
      },
    ]);

  const regenerateCodes = () =>
    Alert.alert(tr('accountSecurity.newCodesConfirm'), tr('accountSecurity.newCodesBody'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('accountSecurity.newCodes'),
        onPress: async () => {
          const list = await run(newRecoveryCodes);
          if (list) {
            setCodes(list);
            setTwoFactor((t) => (t ? { ...t, recoveryCodesLeft: list.length } : t));
          }
        },
      },
    ]);

  const emailActions = (email: EmailAddress) =>
    sheet.open(email.email, [
      ...(!email.primary
        ? [
            {
              label: tr('accountSecurity.makePrimary'),
              icon: 'star' as const,
              onPress: async () => {
                const list = await run((s) => makePrimaryEmail(s, email.email));
                if (list) setEmails(list);
              },
            },
          ]
        : []),
      ...(!email.verified
        ? [
            {
              label: tr('accountSecurity.resendVerification'),
              icon: 'refresh' as const,
              onPress: async () => {
                const ok = await run(async (s) => {
                  await resendVerification(s, email.email);
                  return true;
                });
                if (ok) setNotice(tr('accountSecurity.verificationSent', { email: email.email }));
              },
            },
          ]
        : []),
      {
        label: tr('accountSecurity.removeEmail'),
        icon: 'delete' as const,
        destructive: true,
        disabled: email.primary,
        hint: email.primary ? tr('accountSecurity.primaryCantBeRemoved') : undefined,
        onPress: async () => {
          const list = await run((s) => removeEmail(s, email.email));
          if (list) setEmails(list);
        },
      },
    ]);

  const newEmail = () =>
    prompt.open({
      title: tr('accountSecurity.addEmail'),
      value: '',
      placeholder: tr('accountSecurity.emailPlaceholder'),
      onSave: async (value) => {
        const list = await run((s) => addEmail(s, value));
        if (list) setEmails(list);
      },
    });

  const issuer = credentials ? `AdventureLog (${hostOf(credentials.serverUrl)})` : 'AdventureLog';
  const footer = (text: string) => (
    <FieldGroup.SectionFooter>
      <Text textStyle={{ color: rt.colors.secondary, fontSize: 13 }}>{text}</Text>
    </FieldGroup.SectionFooter>
  );

  return (
    <>
      <Stack.Screen options={{ title: tr('accountSecurity.title') }} />
      <FormHost>
        <FieldGroup>
          {phase.step === 'locked' ? (
            <FieldGroup.Section title={tr('accountSecurity.confirmWithPassword')}>
              <TextInput
                key={`pw-${formKey}`}
                defaultValue=""
                onChangeText={(v) => (password.current = v)}
                onSubmitEditing={() => void submitPassword()}
                placeholder={tr('common.password')}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="key" />}
                onPress={online && !busy ? () => void submitPassword() : undefined}>
                {busy ? tr('common.loading') : tr('accountSecurity.continue')}
              </ListItem>
              {footer(online ? tr('accountSecurity.whyPassword') : tr('common.onlyWithInternet'))}
            </FieldGroup.Section>
          ) : null}

          {phase.step === 'mfa' ? (
            <FieldGroup.Section title={tr('accountSecurity.enterCode')}>
              <TextInput
                defaultValue=""
                onChangeText={setCode}
                onSubmitEditing={() => void submitCode()}
                placeholder="123456"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ListItem
                colors={rt.listColors}
                leading={<RowIcon name="check" />}
                onPress={!busy && code.trim() ? () => void submitCode() : undefined}>
                {busy ? tr('common.loading') : tr('accountSecurity.continue')}
              </ListItem>
              {footer(tr('accountSecurity.codeOrRecovery'))}
            </FieldGroup.Section>
          ) : null}

          {session ? (
            <>
              {notice ? (
                <FieldGroup.Section>
                  <ListItem colors={rt.listColors} leading={<RowIcon name="check" />} onPress={() => setNotice(null)}>
                    {notice}
                  </ListItem>
                </FieldGroup.Section>
              ) : null}

              <FieldGroup.Section title={tr('accountSecurity.password')}>
                <TextInput
                  key={`new-${formKey}`}
                  defaultValue=""
                  onChangeText={setNewPassword}
                  placeholder={tr('accountSecurity.newPassword')}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  key={`repeat-${formKey}`}
                  defaultValue=""
                  onChangeText={setRepeat}
                  placeholder={tr('accountSecurity.repeatPassword')}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <ListItem
                  colors={rt.listColors}
                  leading={<RowIcon name="key" />}
                  onPress={!busy && newPassword && repeat ? () => void savePassword() : undefined}>
                  {tr('accountSecurity.changePassword')}
                </ListItem>
                {footer(tr('accountSecurity.passwordFooter'))}
              </FieldGroup.Section>

              <FieldGroup.Section title={tr('accountSecurity.twoFactor')}>
                {!twoFactor ? (
                  <Text>{tr('common.loading')}</Text>
                ) : twoFactor.totp ? (
                  <>
                    <ListItem colors={rt.listColors} leading={<RowIcon name="check" />}>
                      {tr('accountSecurity.twoFactorOn')}
                    </ListItem>
                    <ListItem
                      colors={rt.listColors}
                      leading={<RowIcon name="key" />}
                      supportingText={
                        twoFactor.recoveryCodesLeft !== null ? (
                          <Sub>{tr('accountSecurity.codesLeft', { count: twoFactor.recoveryCodesLeft })}</Sub>
                        ) : undefined
                      }
                      onPress={
                        busy
                          ? undefined
                          : async () => {
                              const list = await run(recoveryCodes);
                              if (list) setCodes(list);
                            }
                      }>
                      {tr('accountSecurity.showCodes')}
                    </ListItem>
                    <ListItem
                      colors={rt.listColors}
                      leading={<RowIcon name="refresh" />}
                      onPress={busy ? undefined : regenerateCodes}>
                      {tr('accountSecurity.newCodes')}
                    </ListItem>
                    <ListItem
                      colors={{ ...rt.listColors, contentColor: rt.colors.danger }}
                      leading={<RowIcon name="remove" color={rt.colors.danger} />}
                      onPress={busy ? undefined : turnOffTotp}>
                      {tr('accountSecurity.turnOff')}
                    </ListItem>
                  </>
                ) : totpSecret ? (
                  <>
                    <ListItem
                      colors={rt.listColors}
                      leading={<RowIcon name="external" />}
                      onPress={() =>
                        void Linking.openURL(totpLink(totpSecret, user.data?.username ?? '', issuer)).catch(() =>
                          Alert.alert(tr('common.notAvailable'), tr('accountSecurity.noAuthenticatorApp')),
                        )
                      }>
                      {tr('accountSecurity.openAuthenticator')}
                    </ListItem>
                    {copyRow(rt, copy, { label: tr('accountSecurity.secretTapCopy'), value: totpSecret })}
                    <TextInput
                      defaultValue=""
                      onChangeText={setCode}
                      placeholder={tr('accountSecurity.codeFromApp')}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <ListItem
                      colors={rt.listColors}
                      leading={<RowIcon name="check" />}
                      onPress={!busy && code.trim() ? () => void finishTotp() : undefined}>
                      {tr('accountSecurity.activate')}
                    </ListItem>
                    {footer(tr('accountSecurity.setupFooter'))}
                  </>
                ) : (
                  <>
                    <ListItem
                      colors={rt.listColors}
                      leading={<RowIcon name="add" />}
                      onPress={busy ? undefined : () => void beginTotp()}>
                      {tr('accountSecurity.setUp')}
                    </ListItem>
                    {footer(tr('accountSecurity.twoFactorOffFooter'))}
                  </>
                )}
              </FieldGroup.Section>

              {codes ? (
                <FieldGroup.Section title={tr('accountSecurity.recoveryCodes')}>
                  {copyRow(rt, copy, { label: tr('accountSecurity.codesTapCopy'), value: codes.join('\n') })}
                  {codes.map((c) => (
                    <Text key={c} textStyle={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                      {c}
                    </Text>
                  ))}
                  {footer(tr('accountSecurity.codesFooter'))}
                </FieldGroup.Section>
              ) : null}

              <FieldGroup.Section title={tr('accountSecurity.emails')}>
                {emails === null ? <Text>{tr('common.loading')}</Text> : null}
                {(emails ?? []).map((e) => (
                  <ListItem
                    key={e.email}
                    colors={rt.listColors}
                    leading={<RowIcon name={e.primary ? 'star' : 'note'} />}
                    supportingText={
                      <Sub>
                        {[
                          e.primary ? tr('accountSecurity.primary') : null,
                          e.verified ? tr('accountSecurity.verified') : tr('accountSecurity.notVerified'),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Sub>
                    }
                    onPress={busy ? undefined : () => emailActions(e)}>
                    {e.email}
                  </ListItem>
                ))}
                <ListItem colors={rt.listColors} leading={<RowIcon name="add" />} onPress={busy ? undefined : newEmail}>
                  {tr('accountSecurity.addEmail')}
                </ListItem>
              </FieldGroup.Section>
            </>
          ) : null}
        </FieldGroup>
      </FormHost>
      {sheet.sheet}
      {prompt.sheet}
    </>
  );
}

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/[/:].*$/, '');
}
