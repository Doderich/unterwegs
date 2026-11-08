const { withXcodeProject } = require('expo/config-plugins');

/** Make automatic signing discover the share target's App Group, as well as the main app's. */
module.exports = function withShareSigning(config) {
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const attributes = project.getFirstProject().firstProject.attributes;
    attributes.TargetAttributes ??= {};
    for (const [id, target] of Object.entries(project.pbxNativeTargetSection())) {
      if (!target || typeof target !== 'object') continue;
      const name = String(target.name).replaceAll('"', '');
      if (name !== 'expo-sharing-extension' && name !== mod.modRequest.projectName) continue;
      const settings = (attributes.TargetAttributes[id] ??= {});
      settings.ProvisioningStyle = 'Automatic';
      if (config.ios?.appleTeamId) settings.DevelopmentTeam = config.ios.appleTeamId;
      settings.SystemCapabilities = {
        ...settings.SystemCapabilities,
        'com.apple.ApplicationGroups.iOS': { enabled: 1 },
      };
    }
    for (const entry of Object.values(project.pbxXCBuildConfigurationSection())) {
      if (!entry || typeof entry !== 'object' || !entry.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER) continue;
      if (config.ios?.appleTeamId) entry.buildSettings.DEVELOPMENT_TEAM = config.ios.appleTeamId;
      entry.buildSettings.CODE_SIGN_STYLE = 'Automatic';
      // Xcode quotes the identifier. The target is named expo-sharing-extension; the share sheet should show the app.
      const bundleId = String(entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER).replaceAll('"', '');
      if (bundleId.endsWith('.expo-sharing-extension')) {
        entry.buildSettings.INFOPLIST_KEY_CFBundleDisplayName = config.name ?? 'Unterwegs';
      }
    }
    return mod;
  });
};
