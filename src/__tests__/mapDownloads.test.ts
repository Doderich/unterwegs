/* Native prebuild controls must survive repeated prebuilds without duplicate initialization. */
const mutations: Record<
  string,
  (mod: { modResults: { language?: string; contents: string } }) => { modResults: { contents: string } }
> = {};
jest.mock('expo/config-plugins', () => ({
  withAppDelegate: (config: unknown, action: (typeof mutations)[string]) => {
    mutations.ios = action;
    return config;
  },
  withAppBuildGradle: (config: unknown, action: (typeof mutations)[string]) => {
    mutations.gradle = action;
    return config;
  },
  withMainApplication: (config: unknown, action: (typeof mutations)[string]) => {
    mutations.android = action;
    return config;
  },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withMapDownloads = require('../../plugins/with-map-downloads');

it('caps native networking and identifies the app on both platforms, idempotently', () => {
  withMapDownloads({ version: '1.3.0' });
  const inputs = {
    ios: { language: 'swift', contents: 'import Expo\n    let delegate = ReactNativeDelegate()' },
    android: { contents: '    super.onCreate()' },
    gradle: { contents: 'dependencies {}' },
  };
  for (const [platform, input] of Object.entries(inputs)) {
    const once = mutations[platform]({ modResults: input });
    const twice = mutations[platform]({ modResults: { ...input, contents: once.modResults.contents } });
    expect(twice.modResults.contents).toBe(once.modResults.contents);
  }
  expect(inputs.ios.contents).toContain('httpMaximumConnectionsPerHost = 4');
  expect(inputs.ios.contents).toContain('Unterwegs/1.3.0');
  expect(inputs.android.contents).toContain('maxRequests = 4');
  expect(inputs.android.contents).toContain('maxRequestsPerHost = 4');
  expect(inputs.android.contents).toContain('User-Agent');
});

it('initializes MapLibre before its HTTP client loads the SDK application context', () => {
  withMapDownloads({ version: '1.3.1' });
  const { modResults } = mutations.android({ modResults: { contents: '    super.onCreate()' } });
  const initialize = modResults.contents.indexOf('org.maplibre.android.MapLibre.getInstance(this)');
  const configureHttp = modResults.contents.indexOf('org.maplibre.android.module.http.HttpRequestUtil');
  expect(initialize).toBeGreaterThan(modResults.contents.indexOf('super.onCreate()'));
  expect(initialize).toBeLessThan(configureHttp);
});

it('repairs the startup order in an already generated Android project', () => {
  withMapDownloads({ version: '1.3.1' });
  const previous = `    super.onCreate()
    // Unterwegs map downloads
    org.maplibre.android.module.http.HttpRequestUtil.setOkHttpClient(client)`;
  const once = mutations.android({ modResults: { contents: previous } });
  expect(once.modResults.contents).toContain(`// Unterwegs map downloads
    org.maplibre.android.MapLibre.getInstance(this)`);
  const twice = mutations.android({ modResults: { contents: once.modResults.contents } });
  expect(twice.modResults.contents).toBe(once.modResults.contents);
});
