import configure from '../../app.config';
import { redirectSystemPath } from '../app/+native-intent';

const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    UNTERWEGS_APP_ID: 'com.example.unterwegs',
    UNTERWEGS_IOS_BUNDLE_ID: 'com.example.unterwegs.ios',
    UNTERWEGS_UPDATES_URL: 'https://updates.example.org',
    UNTERWEGS_UPDATES_APP_ID: 'test-app',
    UNTERWEGS_UPDATE_CHANNEL: 'production',
  };
});
afterEach(() => {
  process.env = originalEnv;
});
function config() {
  return configure({
    projectRoot: process.cwd(),
    staticConfigPath: null,
    packageJsonPath: 'package.json',
    config: {
      name: 'Unterwegs',
      slug: 'unterwegs',
      version: '1.4.0',
      scheme: 'unterwegs',
      ios: { icon: './assets/unterwegs.icon' },
      android: { adaptiveIcon: { foregroundImage: './assets/images/android-icon-foreground.png' } },
    },
  });
}
it('keeps the existing production identity and runtime', () => {
  expect(config()).toMatchObject({
    name: 'Unterwegs',
    scheme: 'unterwegs',
    runtimeVersion: '1.4.0',
    ios: { bundleIdentifier: 'com.example.unterwegs.ios' },
    android: { package: 'com.example.unterwegs' },
    updates: { requestHeaders: { 'expo-channel-name': 'production', 'xprem-branch': '' } },
  });
});
it('isolates staging identity, URL scheme and update channel while matching the runtime', () => {
  process.env.UNTERWEGS_UPDATE_CHANNEL = 'staging';
  expect(config()).toMatchObject({
    name: 'Unterwegs Staging',
    scheme: 'unterwegs-staging',
    runtimeVersion: '1.4.0',
    ios: { bundleIdentifier: 'com.example.unterwegs.ios.staging', icon: './assets/unterwegs-staging.icon' },
    android: { package: 'com.example.unterwegs.staging', adaptiveIcon: { backgroundColor: '#F59E0B' } },
    updates: { requestHeaders: { 'expo-channel-name': 'staging' } },
  });
});
it('fails closed for missing or unknown channel and missing server app ID', () => {
  delete process.env.UNTERWEGS_UPDATE_CHANNEL;
  expect(config).toThrow('explicitly');
  process.env.UNTERWEGS_UPDATE_CHANNEL = 'preview';
  expect(config).toThrow('staging or production');
  process.env.UNTERWEGS_UPDATE_CHANNEL = 'production';
  delete process.env.UNTERWEGS_UPDATES_APP_ID;
  expect(config).toThrow('UNTERWEGS_UPDATES_APP_ID');
});
it('allows an offline-only build without an update server', () => {
  delete process.env.UNTERWEGS_UPDATES_URL;
  delete process.env.UNTERWEGS_UPDATE_CHANNEL;
  expect(config().updates).toEqual({ enabled: false });
});

it('strips callback credentials from navigation for both variants', () => {
  for (const scheme of ['unterwegs', 'unterwegs-staging']) {
    expect(redirectSystemPath({ path: `${scheme}://login?key=test-key&state=s`, initial: false })).toBe('/login');
  }
});
