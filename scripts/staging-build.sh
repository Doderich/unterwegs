#!/usr/bin/env bash
# Local release-mode builds, separate installs from production. No uploads.
set -euo pipefail
cd "$(dirname "$0")/.."
PLATFORM="${1:-}"
[[ "$PLATFORM" == android || "$PLATFORM" == ios ]] || { echo "Usage: $0 android|ios" >&2; exit 1; }
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
export UNTERWEGS_UPDATE_CHANNEL=staging
unset DISABLE_CODE_SIGNING
: "${UNTERWEGS_APP_ID:?Set UNTERWEGS_APP_ID}"
: "${UNTERWEGS_UPDATES_URL:?Set UNTERWEGS_UPDATES_URL}"
: "${UNTERWEGS_UPDATES_APP_ID:?Set UNTERWEGS_UPDATES_APP_ID}"
[[ -f certs/certificate.pem ]] || { echo "certs/certificate.pem missing" >&2; exit 1; }
npx expo prebuild --platform "$PLATFORM"
if [[ "$PLATFORM" == android ]]; then
  export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
  (cd android && ./gradlew assembleRelease)
  mkdir -p build/staging/android
  cp android/app/build/outputs/apk/release/app-release.apk build/staging/android/unterwegs-staging.apk
else
  mkdir -p build/staging/ios
  WORKSPACES=(ios/*.xcworkspace)
  [[ ${#WORKSPACES[@]} == 1 && -d "${WORKSPACES[0]}" ]] || { echo "Expected one generated workspace" >&2; exit 1; }
  SCHEME="$(basename "${WORKSPACES[0]}" .xcworkspace)"
  xcodebuild -workspace "${WORKSPACES[0]}" -scheme "$SCHEME" \
    -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath build/staging/ios CODE_SIGNING_ALLOWED=NO build
fi
