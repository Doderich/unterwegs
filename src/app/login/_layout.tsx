import { Stack } from 'expo-router';

import { tr } from '@/i18n';

/** The scanner is presented as a modal over the login screen. */
export const unstable_settings = { anchor: 'index' };

/** Signed-out flow: login screen, QR scanner modal and the HTTPS help. One entry point for the auth guard. */
export default function LoginLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Unterwegs', headerLargeTitle: true }} />
      <Stack.Screen name="scan" options={{ title: tr('login.scanQrCode'), presentation: 'modal' }} />
      <Stack.Screen name="web" options={{ title: tr('common.signIn'), presentation: 'modal' }} />
      <Stack.Screen name="https-help" options={{ title: tr('httpsHelp.title') }} />
    </Stack>
  );
}
