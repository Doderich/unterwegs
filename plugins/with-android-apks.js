const { withAppBuildGradle } = require('expo/config-plugins');

/** Complete per-architecture APKs plus a universal fallback for GitHub/Obtainium. */
module.exports = function withAndroidApks(config) {
  return withAppBuildGradle(config, (mod) => {
    const marker = '// Unterwegs release APKs';
    if (mod.modResults.contents.includes(marker)) return mod;
    mod.modResults.contents += `
${marker}
if (findProperty('UNTERWEGS_SPLIT_APKS') == 'true') {
    android {
        splits {
            abi {
                enable true
                reset()
                include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
                universalApk true
            }
        }
        packagingOptions {
            jniLibs {
                useLegacyPackaging true
            }
        }
    }
}
`;
    return mod;
  });
};
