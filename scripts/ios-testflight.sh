#!/usr/bin/env bash
# Archives the iOS release build and uploads it to App Store Connect, for TestFlight (docs/RELEASING.md).
#   npm run ios:testflight -- --channel production|staging [--no-upload] [--public]
# --public: no server preset on the login screen (the App Store build; docs/STORE-RELEASE.md), whatever .env.local sets.
# Signing and upload use the Apple ID signed in to Xcode (Settings → Accounts): the Account Holder of the team in
# UNTERWEGS_APPLE_TEAM_ID, since on an individual membership nobody else may sign.
set -euo pipefail
cd "$(dirname "$0")/.."
# CocoaPods crashes without a UTF-8 locale (e.g. in a background or non-login shell).
export LANG="${LANG:-en_US.UTF-8}" LC_ALL="${LC_ALL:-en_US.UTF-8}"

CHANNEL=production
UPLOAD=1
PUBLIC=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      [[ $# -ge 2 ]] || { echo "Missing value for --channel" >&2; exit 1; }
      CHANNEL="$2"; shift 2 ;;
    --no-upload) UPLOAD=0; shift ;;
    --public) PUBLIC=1; shift ;;
    *) echo "Usage: $0 [--channel production|staging] [--no-upload] [--public]" >&2; exit 1 ;;
  esac
done
[[ "$CHANNEL" == production || "$CHANNEL" == staging ]] || { echo "Invalid channel: choose production or staging" >&2; exit 1; }

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
: "${UNTERWEGS_APPLE_TEAM_ID:?Set UNTERWEGS_APPLE_TEAM_ID in .env.local}"
# The command argument wins over the ordinary development default in .env.local.
export UNTERWEGS_UPDATE_CHANNEL="$CHANNEL"
# Set but empty, so Expo's own .env.local loading doesn't fill it in again.
if [[ $PUBLIC == 1 ]]; then export EXPO_PUBLIC_DEFAULT_SERVER_URL=""; fi
unset DISABLE_CODE_SIGNING
: "${UNTERWEGS_APP_ID:?Set UNTERWEGS_APP_ID in .env.local}"

# A UTC timestamp: always higher than the previous upload, nothing to commit. The extension gets the same
# version and build number as the app, as App Store Connect expects.
UNTERWEGS_BUILD_NUMBER="$(date -u +%Y%m%d%H%M)"
export UNTERWEGS_BUILD_NUMBER
VERSION="$(node -p "require('./app.json').expo.version")"

APP_NAME="Unterwegs Production"
BUNDLE_ID="${UNTERWEGS_IOS_BUNDLE_ID:-$UNTERWEGS_APP_ID}"
if [[ "$CHANNEL" == staging ]]; then
  APP_NAME="Unterwegs Staging"
  BUNDLE_ID="${BUNDLE_ID}.staging"
fi
OUT="build/testflight/${CHANNEL}-${VERSION}-${UNTERWEGS_BUILD_NUMBER}"
mkdir -p "$OUT"
ARCHIVE="$OUT/Unterwegs-${CHANNEL}.xcarchive"

echo "${APP_NAME}: ${VERSION} (${UNTERWEGS_BUILD_NUMBER}), channel=${CHANNEL}, bundle=${BUNDLE_ID}, server preset: $([[ -n ${EXPO_PUBLIC_DEFAULT_SERVER_URL:-} ]] && echo yes || echo none)"
echo "Expected App Store Connect record: ${APP_NAME} (matched by bundle ID)"
npx expo prebuild --platform ios

WORKSPACES=(ios/*.xcworkspace)
[[ ${#WORKSPACES[@]} == 1 && -d "${WORKSPACES[0]}" ]] || { echo "Expected one generated workspace" >&2; exit 1; }
SCHEME="$(basename "${WORKSPACES[0]}" .xcworkspace)"
xcodebuild archive \
  -workspace "${WORKSPACES[0]}" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$UNTERWEGS_APPLE_TEAM_ID" \
  MARKETING_VERSION="$VERSION" \
  CURRENT_PROJECT_VERSION="$UNTERWEGS_BUILD_NUMBER"

if [[ $UPLOAD == 0 ]]; then
  echo "Archived ${APP_NAME}: ${ARCHIVE}; nothing uploaded"
  exit 0
fi

cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>${UNTERWEGS_APPLE_TEAM_ID}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>manageAppVersionAndBuildNumber</key><false/>
  <key>uploadSymbols</key><true/>
</dict>
</plist>
PLIST

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" \
  -exportPath "$OUT" \
  -allowProvisioningUpdates

echo "Uploaded ${APP_NAME}: ${VERSION} (${UNTERWEGS_BUILD_NUMBER}), channel=${CHANNEL}. It appears in the matching App Store Connect record → TestFlight after processing."
