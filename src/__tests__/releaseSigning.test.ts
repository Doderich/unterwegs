// Config plugins run at prebuild time; exercise the generated Gradle signing without Gradle.
jest.mock('expo/config-plugins', () => ({ withAppBuildGradle: (_config: unknown, action: unknown) => action }));

// eslint-disable-next-line @typescript-eslint/no-require-imports -- a CommonJS config plugin
const withReleaseSigning = require('../../plugins/with-release-signing');

const template = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

function apply(contents: string): string {
  const mod = { modResults: { contents } };
  withReleaseSigning({})(mod);
  return mod.modResults.contents;
}

it('signs release builds with the upload key when its properties are set, else with the debug key', () => {
  const gradle = apply(template);
  expect(gradle).toContain("storeFile file(findProperty('UNTERWEGS_UPLOAD_STORE_FILE'))");
  expect(gradle).toContain(
    "signingConfig findProperty('UNTERWEGS_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
  );
  // Debug builds stay on the debug key.
  expect(gradle).toMatch(/debug \{\n\s*signingConfig signingConfigs\.debug/);
});

it('applies only once', () => {
  const once = apply(template);
  expect(apply(once)).toBe(once);
});

it('fails loudly when the template no longer matches', () => {
  expect(() => apply('android { signingConfigs {\n} buildTypes { }}')).toThrow('release buildType not found');
});
