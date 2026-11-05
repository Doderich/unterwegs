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

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
# Distribution scripts always build the family production variant.
export UNTERWEGS_UPDATE_CHANNEL=production
unset DISABLE_CODE_SIGNING
: "${UNTERWEGS_APP_ID:?Set UNTERWEGS_APP_ID in .env.local}"
: "${UNTERWEGS_KEYSTORE_OP_REF:?Set UNTERWEGS_KEYSTORE_OP_REF in .env.local (docs/RELEASING.md)}"
: "${UNTERWEGS_KEYSTORE_PASSWORD_OP_REF:?Set UNTERWEGS_KEYSTORE_PASSWORD_OP_REF in .env.local (docs/RELEASING.md)}"
: "${UNTERWEGS_UPLOAD_CERT_SHA256:?Set UNTERWEGS_UPLOAD_CERT_SHA256 in .env.local: every APK is checked against the upload certificate}"
: "${UNTERWEGS_RELEASE_REPO:?Set UNTERWEGS_RELEASE_REPO in .env.local: a private repo for the APKs (they embed personal URLs)}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

# An explicit personal account must win over an unrelated service-account token inherited from the shell.
OP_COMMAND=(op)
if [[ -n "${OP_ACCOUNT:-}" ]]; then
  OP_COMMAND=(env -u OP_SERVICE_ACCOUNT_TOKEN op --account "$OP_ACCOUNT")
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit first: a release is built from the committed state." >&2
  exit 1
fi
if [[ $PUBLISH == 1 && -z "$(git branch -r --contains HEAD)" ]]; then
  echo "Push first: the GitHub release points at this commit." >&2
  exit 1
fi
npm run check

# Minutes since 1970: always higher than the previous release, nothing to commit, fits Android's limit.
UNTERWEGS_VERSION_CODE="$(($(date +%s) / 60))"
export UNTERWEGS_VERSION_CODE
VERSION="$(node -p "require('./app.json').expo.version")"
NAME="${VERSION}-${UNTERWEGS_VERSION_CODE}" # versionName, release tag and Obtainium version

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
"${OP_COMMAND[@]}" read --out-file "$TMP/upload.keystore" "$UNTERWEGS_KEYSTORE_OP_REF" >/dev/null
# Gradle reads ORG_GRADLE_PROJECT_* as project properties: the password stays out of the process list.
export ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_STORE_FILE="$TMP/upload.keystore"
ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_STORE_PASSWORD="$("${OP_COMMAND[@]}" read "$UNTERWEGS_KEYSTORE_PASSWORD_OP_REF")"
ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_KEY_PASSWORD="$ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_STORE_PASSWORD"
ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_KEY_ALIAS="upload" # scripts/android-keystore.sh
export ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_STORE_PASSWORD ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_KEY_PASSWORD \
  ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_KEY_ALIAS

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

APKSIGNER="$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)"
for APK in "${APKS[@]}"; do
  SIGNER="$("$APKSIGNER" verify --print-certs "$APK" | awk -F': ' '/certificate SHA-256 digest/ {print $NF; exit}')"
  expected="$(echo "$UNTERWEGS_UPLOAD_CERT_SHA256" | tr -d ':' | tr '[:upper:]' '[:lower:]')"
  if [[ -z "$SIGNER" || "$SIGNER" != "$expected" ]]; then
    echo "APK is signed with ${SIGNER:-an unknown key}, not the upload key. Not publishing." >&2
    exit 1
  fi
  echo "Signed: $APK (certificate $SIGNER)"
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
