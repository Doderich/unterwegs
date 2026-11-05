import { Button, Column } from '@expo/ui';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AuthError } from '@/api/client';
import { parseLoginQr, qrHost } from '@/auth/qr';
import { useSession } from '@/auth/session';
import { tr } from '@/i18n';
import { serverCompatText } from '@/api/errors';
import { haptics } from '@/settings/haptics';
import { useColors } from '@/ui/theme';
import { Text } from '@/ui/Text';
import { Host } from '@/ui/Host';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { signIn } = useSession();
  const colors = useColors();
  const [status, setStatus] = useState<string>(() => tr('loginScan.pointCameraAtQrCode'));
  const handling = useRef(false);

  async function onScanned({ data }: BarcodeScanningResult) {
    if (handling.current) return;
    const creds = parseLoginQr(data);
    if (!creds) {
      setStatus(tr('loginScan.isntAdventurelogSigninCode'));
      return;
    }
    handling.current = true;
    // A code can point anywhere: the user confirms the server before anything is sent to it.
    const confirmed = await new Promise<boolean>((resolve) =>
      Alert.alert(
        tr('loginScan.signInToThisServer'),
        tr('loginScan.onlyContinueIfYourServer', { host: qrHost(creds) }),
        [
          { text: tr('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: tr('common.signIn'), onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      ),
    );
    if (!confirmed) {
      setTimeout(() => (handling.current = false), 1500);
      return;
    }
    setStatus(tr('loginScan.signingIn'));
    try {
      await signIn(creds);
      haptics.success();
      // The auth guard swaps the stack; close the modal if it's still there.
      if (router.canGoBack()) router.back();
    } catch (e) {
      haptics.error();
      setStatus(
        e instanceof AuthError
          ? tr('loginScan.codeHasExpiredOrWas')
          : (serverCompatText(e) ?? tr('loginScan.cantReachServerCheckInternet')),
      );
      setTimeout(() => (handling.current = false), 1500);
    }
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Host style={{ flex: 1 }}>
        <Column spacing={16} alignment="center" style={{ padding: 24 }}>
          <Text textStyle={{ fontSize: 17, textAlign: 'center' }}>{tr('loginScan.signInUnterwegsNeedsOnetime')}</Text>
          {permission.canAskAgain ? (
            <Button label={tr('loginScan.allowCamera')} onPress={() => void requestPermission()} />
          ) : (
            <Button label={tr('loginScan.openSettings')} onPress={() => void Linking.openSettings()} />
          )}
        </Column>
      </Host>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScanned}
      />
      <View style={[styles.frame, { borderColor: colors.tint }]} pointerEvents="none" />
      <Host matchContents style={styles.status}>
        <Text textStyle={{ color: '#FFFFFF', fontSize: 16, textAlign: 'center' }}>{status}</Text>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderWidth: 3, borderRadius: 24 },
  status: {
    position: 'absolute',
    bottom: 64,
    left: 24,
    right: 24,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
