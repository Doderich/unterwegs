#!/usr/bin/env bash
# Builds a signed Android release APK and publishes it as a GitHub release in a private repo
# (UNTERWEGS_RELEASE_REPO), which phones follow with Obtainium (docs/RELEASING.md).
#   npm run android:publish                 build, sign, verify, publish
#   npm run android:publish -- --no-publish build, sign and verify only
# The upload keystore and its password come from 1Password (UNTERWEGS_KEYSTORE_OP_REF,
# UNTERWEGS_KEYSTORE_PASSWORD_OP_REF in .env.local).
set -euo pipefail
cd "$(dirname "$0")/.."

PUBLISH=1
[[ "${1:-}" == "--no-publish" ]] && PUBLISH=0

# shellcheck source=scripts/android-signing.sh
source scripts/android-signing.sh
: "${UNTERWEGS_RELEASE_REPO:?Set UNTERWEGS_RELEASE_REPO in .env.local: a private repo for the APKs (they embed personal URLs)}"
if [[ $PUBLISH == 1 && -z "$(git branch -r --contains HEAD)" ]]; then
  echo "Push first: the GitHub release points at this commit." >&2
  exit 1
fi
npm run check
sign_with_upload_key

echo "Unterwegs ${NAME} (${UNTERWEGS_APP_ID})"
npx expo prebuild --platform android
(cd android && ./gradlew assembleRelease -PUNTERWEGS_SPLIT_APKS=true)

OUT="build/android"
mkdir -p "$OUT"
APKS=()
for variant in arm64-v8a universal; do
  APK="$OUT/unterwegs-${NAME}-${variant}.apk"
  cp "android/app/build/outputs/apk/release/app-${variant}-release.apk" "$APK"
  APKS+=("$APK")
done

for APK in "${APKS[@]}"; do
  verify_upload_cert "$APK"
  shasum -a 256 "$APK" > "$APK.sha256"
done

# Preserve the maps from this exact build for offline diagnosis (no source maps in public assets).
mkdir -p "$OUT/${NAME}-symbols"
cp android/app/build/outputs/mapping/release/mapping.txt "$OUT/${NAME}-symbols/"
cp android/app/build/generated/sourcemaps/react/release/index.android.bundle.map "$OUT/${NAME}-symbols/"

if [[ $PUBLISH == 1 ]]; then
  gh release create "$NAME" "${APKS[@]}" --repo "$UNTERWEGS_RELEASE_REPO" \
    --title "Unterwegs $NAME" --notes "$(git log -1 --format=%s)"
fi
