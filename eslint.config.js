// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'docs/*', 'src/api/generated.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/ui/Host*.tsx', 'src/ui/Text*.tsx', 'src/ui/TextInput.tsx', 'src/ui/stableNative.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@expo/ui',
              importNames: ['Host'],
              message: "Use Host from '@/ui/Host': it keeps Android's Compose theme in step with the app appearance.",
            },
            {
              name: '@expo/ui',
              importNames: ['Text'],
              message: "Use Text from '@/ui/Text': it follows the iOS text-size setting.",
            },
            {
              name: '@expo/ui',
              importNames: ['TextInput'],
              message:
                "Use TextInput from '@/ui/TextInput': it skips native re-renders, which make the iOS autofill bar flicker while typing.",
            },
          ],
        },
      ],
    },
  },
]);
