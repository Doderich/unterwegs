#!/usr/bin/env bash
# Explicit OTA target; see docs/RELEASING.md. No arbitrary eoas arguments are forwarded.
set -euo pipefail
cd "$(dirname "$0")/.."
CHANNEL="" PLATFORM=all CONFIRM_COMMIT="" DRY_RUN=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel|--platform|--confirm-commit)
      [[ $# -ge 2 ]] || { echo "Missing value for $1" >&2; exit 1; }
      case "$1" in
        --channel) CHANNEL="$2" ;; --platform) PLATFORM="$2" ;; --confirm-commit) CONFIRM_COMMIT="$2" ;;
      esac
      shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "Unknown argument: $1. Use --channel staging|production [--platform all|ios|android] [--confirm-commit SHA] [--dry-run]" >&2; exit 1 ;;
  esac
done
[[ "$CHANNEL" == staging || "$CHANNEL" == production ]] || { echo "Choose --channel staging or production" >&2; exit 1; }
[[ "$PLATFORM" == all || "$PLATFORM" == android || "$PLATFORM" == ios ]] || { echo "Invalid platform" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "Commit first: working tree must be clean" >&2; exit 1; }
COMMIT="$(git rev-parse HEAD)"
# Refresh remote evidence: a stale tracking ref must not authorize a release.
git fetch --prune origin
[[ -n "$(git for-each-ref --contains "$COMMIT" --format='%(refname)' refs/remotes/origin/ | sed '/\/HEAD$/d')" ]] || {
  echo "Push first: commit is not on origin" >&2; exit 1;
}
if [[ "$CHANNEL" == production ]]; then
  [[ "$COMMIT" == "$(git rev-parse refs/remotes/origin/main)" ]] || { echo "Production must use the current origin/main commit" >&2; exit 1; }
  [[ "$CONFIRM_COMMIT" == "$COMMIT" ]] || { echo "Production requires --confirm-commit $COMMIT" >&2; exit 1; }
fi
# eoas exports with EXPO_NO_DOTENV=1; export the same values used by native builds.
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
export UNTERWEGS_UPDATE_CHANNEL="$CHANNEL" RELEASE_CHANNEL="$CHANNEL"
unset DISABLE_CODE_SIGNING
: "${UNTERWEGS_APP_ID:?Set UNTERWEGS_APP_ID}"
: "${UNTERWEGS_UPDATES_URL:?Set UNTERWEGS_UPDATES_URL}"
: "${UNTERWEGS_UPDATES_APP_ID:?Set UNTERWEGS_UPDATES_APP_ID}"
# An explicit empty preset is valid; an unset value usually means CI forgot the build environment.
[[ "${EXPO_PUBLIC_DEFAULT_SERVER_URL+x}" == x ]] || { echo "Set EXPO_PUBLIC_DEFAULT_SERVER_URL (empty is allowed)" >&2; exit 1; }
[[ -f certs/certificate.pem ]] || { echo "certs/certificate.pem missing" >&2; exit 1; }
RUNTIME="$(node -p "require('./app.json').expo.version")"
if [[ $DRY_RUN == 1 ]]; then
  echo "Validated $COMMIT: channel=$CHANNEL branch=$CHANNEL runtime=$RUNTIME platform=$PLATFORM; nothing published"
  exit 0
fi
npm run check
[[ "$COMMIT" == "$(git rev-parse HEAD)" && -z "$(git status --porcelain)" ]] || { echo "Checkout changed during checks" >&2; exit 1; }
if [[ -z "${EOO_TOKEN:-}" && -n "${EOO_TOKEN_OP_REF:-}" ]]; then
  if [[ -n "${OP_ACCOUNT:-}" ]]; then
    EOO_TOKEN="$(env -u OP_SERVICE_ACCOUNT_TOKEN op --account "$OP_ACCOUNT" read "$EOO_TOKEN_OP_REF")"
  else
    EOO_TOKEN="$(op read "$EOO_TOKEN_OP_REF")"
  fi
  export EOO_TOKEN
fi
: "${EOO_TOKEN:?Set EOO_TOKEN or EOO_TOKEN_OP_REF}"
umask 077
mkdir -p build/updates
OUT="$(mktemp -d "build/updates/$(date -u +%Y%m%dT%H%M%SZ)-${CHANNEL}-${COMMIT:0:12}-${PLATFORM}-XXXXXX")"
export OTA_RECORD_COMMIT="$COMMIT" OTA_RECORD_CHANNEL="$CHANNEL" OTA_RECORD_PLATFORM="$PLATFORM" OTA_RECORD_RUNTIME="$RUNTIME"
node scripts/update-record.mjs "$OUT" started
# Retain output even on a failed/partial publish. Never automatically retry a failed publish.
if npx --yes eoas@3.2.7 publish --branch "$CHANNEL" --platform "$PLATFORM" --nonInteractive \
  --emitMetadata --outputDir "$OUT/export" -m "$COMMIT $(git log -1 --format=%s)" 2>&1 | tee "$OUT/publish.log"; then
  node scripts/update-record.mjs "$OUT" published
else
  node scripts/update-record.mjs "$OUT" failed
  echo "Publish failed or partially completed; inspect $OUT before retrying" >&2
  exit 1
fi
