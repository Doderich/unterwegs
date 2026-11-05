import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Personal values (app id, Apple team, default server, update server) come from the environment, never from the
 * repo. Put them in `.env.local` (gitignored); see `.env.example`.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const channel = process.env.UNTERWEGS_UPDATE_CHANNEL;
  if (channel && channel !== 'staging' && channel !== 'production') {
    throw new Error('UNTERWEGS_UPDATE_CHANNEL must be staging or production');
  }
  if (process.env.UNTERWEGS_UPDATES_URL && !channel) {
    throw new Error('Set UNTERWEGS_UPDATE_CHANNEL explicitly when enabling updates');
  }
  const staging = channel === 'staging';
  const suffix = staging ? '.staging' : '';
  const appId = (process.env.UNTERWEGS_APP_ID || 'com.example.unterwegs') + suffix;
  const iosId =
    (process.env.UNTERWEGS_IOS_BUNDLE_ID || process.env.UNTERWEGS_APP_ID || 'com.example.unterwegs') + suffix;
  return {
    ...config,
    name: staging ? 'Unterwegs Staging' : (config.name ?? 'Unterwegs'),
    scheme: staging ? 'unterwegs-staging' : config.scheme,
    slug: config.slug ?? 'unterwegs',
    ios: {
      ...config.ios,
      // An iOS bundle id belongs to the Apple team that registered it first; a team change may need another one.
      bundleIdentifier: iosId,
      ...(staging ? { icon: './assets/unterwegs-staging.icon' } : {}),
      ...(process.env.UNTERWEGS_APPLE_TEAM_ID ? { appleTeamId: process.env.UNTERWEGS_APPLE_TEAM_ID } : {}),
      // Every App Store Connect upload needs a higher build number; `npm run ios:testflight` sets it.
      ...(process.env.UNTERWEGS_BUILD_NUMBER ? { buildNumber: process.env.UNTERWEGS_BUILD_NUMBER } : {}),
    },
    android: {
      ...config.android,
      package: appId,
      ...androidVersion(config.version),
      ...(staging
        ? {
            adaptiveIcon: {
              foregroundImage: config.android?.adaptiveIcon?.foregroundImage,
              monochromeImage: config.android?.adaptiveIcon?.monochromeImage,
              backgroundColor: '#F59E0B',
            },
          }
        : {}),
    },
    // Bump `version` in app.json with every native change (new native module, config plugin, SDK):
    // updates only reach builds with the same runtime version. A literal, not the `appVersion` policy, because
    // the policy would take the Android versionName below, which also carries the build.
    runtimeVersion: config.version,
    updates: updatesConfig(),
    extra: observeConfig(config.extra),
  };
};

/** Send operational health to the same self-hosted server; never use Expo's hosted endpoint. */
function observeConfig(extra: ExpoConfig['extra']): ExpoConfig['extra'] {
  const base = process.env.UNTERWEGS_UPDATES_URL?.replace(/\/+$/, '');
  const app = process.env.UNTERWEGS_UPDATES_APP_ID;
  if (!base || !app) return extra;
  return {
    ...extra,
    eas: {
      ...extra?.eas,
      projectId: extra?.eas?.projectId || 'xprem',
      observe: { endpointUrl: `${base}/observe/${app}` },
    },
  };
}

/**
 * Every Android release needs a higher versionCode; `npm run android:publish` sets it. The versionName carries it
 * too (`1.2.0-<code>`), equal to the GitHub release tag, so Obtainium can tell which release is installed.
 */
function androidVersion(version: string | undefined): Partial<NonNullable<ExpoConfig['android']>> {
  const code = Number(process.env.UNTERWEGS_VERSION_CODE);
  if (!code) return {};
  return { versionCode: code, version: `${version}-${code}` };
}

/**
 * Over-the-air updates from a self-hosted xprem server (docs/RELEASING.md). Without `UNTERWEGS_UPDATES_URL` the
 * build only runs its embedded bundle.
 */
function updatesConfig(): ExpoConfig['updates'] {
  const base = process.env.UNTERWEGS_UPDATES_URL?.replace(/\/+$/, '');
  if (!base) return { enabled: false };
  if (!process.env.UNTERWEGS_UPDATES_APP_ID) throw new Error('Set UNTERWEGS_UPDATES_APP_ID when enabling updates');
  // Dev builds load JS from Metro and have no private key to sign with: `npm run android` / `ios` set this.
  const signed = !process.env.DISABLE_CODE_SIGNING;
  return {
    enabled: true,
    url: `${base}/manifest`,
    // Check on every start, never wait for the network: the app opens with what it has (offline first),
    // a downloaded update applies on the next start.
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    ...(signed
      ? {
          codeSigningCertificate: './certs/certificate.pem',
          codeSigningMetadata: { keyid: 'main', alg: 'rsa-v1_5-sha256' },
        }
      : {}),
    // Embedded at build time; changing a server mapping does not change a build's channel.
    requestHeaders: {
      'expo-channel-name': process.env.UNTERWEGS_UPDATE_CHANNEL!,
      'expo-app-id': process.env.UNTERWEGS_UPDATES_APP_ID ?? '',
      'xprem-branch': '',
    },
  };
}
