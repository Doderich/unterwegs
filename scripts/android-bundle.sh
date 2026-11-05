#!/usr/bin/env bash
# Builds the signed Android App Bundle (AAB) for Google Play and optionally uploads it to a testing track
# (docs/RELEASING.md → Google Play).
#   npm run android:bundle                                   build, sign and verify only (first upload: by hand)
#   npm run android:bundle -- --upload [--track internal] [--status draft|completed]
#   npm run android:bundle -- --check                         only check the service account's Play access
# Signed with the upload key from 1Password, like android:publish; Play re-signs it with the app signing key.
# Uploads use a Google Cloud service account (UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF in .env.local).
set -euo pipefail
cd "$(dirname "$0")/.."

UPLOAD=0
CHECK=0
TRACK=internal
# Play only accepts draft releases until the app has been published once; roll them out in the Play Console.
STATUS=draft
while [[ $# -gt 0 ]]; do
  case "$1" in
    --upload) UPLOAD=1; shift ;;
    --track) TRACK="$2"; shift 2 ;;
    --status) STATUS="$2"; shift 2 ;;
    --check) CHECK=1; shift ;;
    *) echo "Usage: $0 [--check | --upload [--track internal|alpha|beta|production] [--status draft|completed]]" >&2; exit 1 ;;
  esac
done

if [[ $CHECK == 1 ]]; then
  # No build: needs only the app id and the service account from .env.local.
  set -a
  # shellcheck disable=SC1091
  [[ -f .env.local ]] && source .env.local
  set +a
  : "${UNTERWEGS_APP_ID:?Set UNTERWEGS_APP_ID in .env.local}"
  : "${UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF:?Set UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF in .env.local (docs/RELEASING.md → Google Play)}"
  OP_COMMAND=(op)
  [[ -n "${OP_ACCOUNT:-}" ]] && OP_COMMAND=(env -u OP_SERVICE_ACCOUNT_TOKEN op --account "$OP_ACCOUNT")
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  "${OP_COMMAND[@]}" read --out-file "$TMP/play-service-account.json" "$UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF" >/dev/null
  node scripts/play-upload.mjs --credentials "$TMP/play-service-account.json" --package "$UNTERWEGS_APP_ID" --check
  exit
fi

# shellcheck source=scripts/android-signing.sh
source scripts/android-signing.sh
if [[ $UPLOAD == 1 ]]; then
  : "${UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF:?Set UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF in .env.local (docs/RELEASING.md → Google Play)}"
fi
npm run check
sign_with_upload_key

echo "Unterwegs ${NAME} (${UNTERWEGS_APP_ID}), app bundle"
npx expo prebuild --platform android
(cd android && ./gradlew bundleRelease)

OUT="build/android"
mkdir -p "$OUT/${NAME}-symbols"
AAB="$OUT/unterwegs-${NAME}.aab"
cp android/app/build/outputs/bundle/release/app-release.aab "$AAB"
verify_upload_cert "$AAB"
shasum -a 256 "$AAB" > "$AAB.sha256"

MAPPING="$OUT/${NAME}-symbols/mapping.txt"
cp android/app/build/outputs/mapping/release/mapping.txt "$MAPPING"
cp android/app/build/generated/sourcemaps/react/release/index.android.bundle.map "$OUT/${NAME}-symbols/"

if [[ $UPLOAD == 1 ]]; then
  "${OP_COMMAND[@]}" read --out-file "$TMP/play-service-account.json" "$UNTERWEGS_PLAY_SERVICE_ACCOUNT_OP_REF" >/dev/null
  node scripts/play-upload.mjs \
    --credentials "$TMP/play-service-account.json" \
    --package "$UNTERWEGS_APP_ID" \
    --bundle "$AAB" \
    --mapping "$MAPPING" \
    --track "$TRACK" \
    --status "$STATUS" \
    --name "$NAME"
else
  echo "Built ${AAB}; nothing uploaded. The first bundle goes up by hand in the Play Console."
fi
