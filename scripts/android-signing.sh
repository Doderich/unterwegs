# Sourced by the Android release scripts (android-publish.sh, android-bundle.sh): loads .env.local, checks that the
# release is built from committed code, picks the versionCode and hands the upload key from 1Password to Gradle.
# Sets VERSION, UNTERWEGS_VERSION_CODE, NAME, TMP (removed on exit) and OP_COMMAND; defines verify_upload_cert.
# shellcheck shell=bash

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
# UNTERWEGS_PUBLIC=1 (the scripts' --public): no server preset on the login screen, whatever .env.local sets, for the
# store build and the APKs on the same runtime (docs/RELEASING.md). Set but empty, so Expo's .env.local loading keeps it.
if [[ "${UNTERWEGS_PUBLIC:-0}" == 1 ]]; then export EXPO_PUBLIC_DEFAULT_SERVER_URL=""; fi
# Distribution scripts always build the family production variant.
export UNTERWEGS_UPDATE_CHANNEL=production
unset DISABLE_CODE_SIGNING
: "${UNTERWEGS_APP_ID:?Set UNTERWEGS_APP_ID in .env.local}"
: "${UNTERWEGS_KEYSTORE_OP_REF:?Set UNTERWEGS_KEYSTORE_OP_REF in .env.local (docs/RELEASING.md)}"
: "${UNTERWEGS_KEYSTORE_PASSWORD_OP_REF:?Set UNTERWEGS_KEYSTORE_PASSWORD_OP_REF in .env.local (docs/RELEASING.md)}"
: "${UNTERWEGS_UPLOAD_CERT_SHA256:?Set UNTERWEGS_UPLOAD_CERT_SHA256 in .env.local: every build is checked against the upload certificate}"
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

# Minutes since 1970: always higher than the previous release, nothing to commit, fits Android's limit.
UNTERWEGS_VERSION_CODE="$(($(date +%s) / 60))"
export UNTERWEGS_VERSION_CODE
VERSION="$(node -p "require('./app.json').expo.version")"
NAME="${VERSION}-${UNTERWEGS_VERSION_CODE}" # versionName, release tag and Obtainium version

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

sign_with_upload_key() {
  "${OP_COMMAND[@]}" read --out-file "$TMP/upload.keystore" "$UNTERWEGS_KEYSTORE_OP_REF" >/dev/null
  # Gradle reads ORG_GRADLE_PROJECT_* as project properties: the password stays out of the process list.
  export ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_STORE_FILE="$TMP/upload.keystore"
  ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_STORE_PASSWORD="$("${OP_COMMAND[@]}" read "$UNTERWEGS_KEYSTORE_PASSWORD_OP_REF")"
  ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_KEY_PASSWORD="$ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_STORE_PASSWORD"
  ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_KEY_ALIAS="upload" # scripts/android-keystore.sh
  export ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_STORE_PASSWORD ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_KEY_PASSWORD \
    ORG_GRADLE_PROJECT_UNTERWEGS_UPLOAD_KEY_ALIAS
}

# verify_upload_cert <apk|aab>: exits unless the file is signed with the upload key.
verify_upload_cert() {
  local file="$1" signer expected
  expected="$(echo "$UNTERWEGS_UPLOAD_CERT_SHA256" | tr -d ':' | tr '[:upper:]' '[:lower:]')"
  if [[ "$file" == *.aab ]]; then
    # An app bundle is JAR-signed; keytool prints its certificate.
    signer="$(keytool -printcert -jarfile "$file" | awk '/SHA256:/ {print $2; exit}' | tr -d ':' | tr '[:upper:]' '[:lower:]')"
  else
    local apksigner
    apksigner="$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)"
    signer="$("$apksigner" verify --print-certs "$file" | awk -F': ' '/certificate SHA-256 digest/ {print $NF; exit}')"
  fi
  if [[ -z "$signer" || "$signer" != "$expected" ]]; then
    echo "$file is signed with ${signer:-an unknown key}, not the upload key. Not publishing." >&2
    exit 1
  fi
  echo "Signed: $file (certificate $signer)"
}
