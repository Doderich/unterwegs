// Config plugins run at prebuild time; exercise their generated Xcode settings without Xcode.
jest.mock('expo/config-plugins', () => ({ withXcodeProject: (_config: unknown, action: unknown) => action }));

const withShareSigning = require('../../plugins/with-share-signing');

it('configures App Groups and the build team for both app and share extension', () => {
  const attributes = { TargetAttributes: {} };
  const appSettings = { PRODUCT_BUNDLE_IDENTIFIER: 'com.example.unterwegs' };
  const shareSettings = { PRODUCT_BUNDLE_IDENTIFIER: 'com.example.unterwegs.expo-sharing-extension' };
  const project = {
    getFirstProject: () => ({ firstProject: { attributes } }),
    pbxNativeTargetSection: () => ({
      app: { name: 'Unterwegs' },
      share: { name: '"expo-sharing-extension"' },
      app_comment: 'Unterwegs',
    }),
    pbxXCBuildConfigurationSection: () => ({
      app: { buildSettings: appSettings },
      share: { buildSettings: shareSettings },
    }),
  };
  const apply = withShareSigning({ ios: { appleTeamId: 'EXAMPLETEAM' } });
  apply({ modResults: project, modRequest: { projectName: 'Unterwegs' } });
  const expected = {
    ProvisioningStyle: 'Automatic',
    DevelopmentTeam: 'EXAMPLETEAM',
    SystemCapabilities: { 'com.apple.ApplicationGroups.iOS': { enabled: 1 } },
  };
  expect(attributes.TargetAttributes).toEqual({ app: expected, share: expected });
  expect(appSettings).toMatchObject({ DEVELOPMENT_TEAM: 'EXAMPLETEAM', CODE_SIGN_STYLE: 'Automatic' });
  expect(shareSettings).toMatchObject({ DEVELOPMENT_TEAM: 'EXAMPLETEAM', CODE_SIGN_STYLE: 'Automatic' });
});

it('registers the signing fix before expo-sharing so it runs after the extension is generated', () => {
  const plugins = require('../../app.json').expo.plugins;
  expect(plugins.indexOf('./plugins/with-share-signing')).toBeLessThan(
    plugins.findIndex((p: unknown) => Array.isArray(p) && p[0] === 'expo-sharing'),
  );
});
