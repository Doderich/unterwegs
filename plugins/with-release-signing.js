const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Sign Android release builds with the upload keystore when its Gradle properties are set
 * (`npm run android:publish` passes them from 1Password). Without them, release builds keep the debug key,
 * so `npm run android:release` still works on any machine.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes('UNTERWEGS_UPLOAD_STORE_FILE')) return mod;

    gradle = gradle.replace(
      /signingConfigs \{\n/,
      `signingConfigs {
        if (findProperty('UNTERWEGS_UPLOAD_STORE_FILE')) {
            release {
                storeFile file(findProperty('UNTERWEGS_UPLOAD_STORE_FILE'))
                storePassword findProperty('UNTERWEGS_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('UNTERWEGS_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('UNTERWEGS_UPLOAD_KEY_PASSWORD')
            }
        }
`,
    );
    const releaseSigning = /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/;
    if (!releaseSigning.test(gradle)) throw new Error('with-release-signing: release buildType not found');
    gradle = gradle.replace(
      releaseSigning,
      "$1signingConfig findProperty('UNTERWEGS_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    mod.modResults.contents = gradle;
    return mod;
  });
};
