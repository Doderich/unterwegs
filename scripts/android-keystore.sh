#!/usr/bin/env bash
# One-time: creates the Android upload keystore and attaches it to its 1Password item (docs/RELEASING.md).
#   ./scripts/android-keystore.sh
# Reads UNTERWEGS_KEYSTORE_OP_REF (op://<vault>/<item>/[<section>/]<field>, where the file goes) and
# UNTERWEGS_KEYSTORE_PASSWORD_OP_REF (an existing password field of the same item) from .env.local.
# Android only installs an update signed with the same key as the installed app: never lose or replace it.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
: "${UNTERWEGS_KEYSTORE_OP_REF:?Set UNTERWEGS_KEYSTORE_OP_REF=op://<vault>/<item>/keystore in .env.local}"
: "${UNTERWEGS_KEYSTORE_PASSWORD_OP_REF:?Set UNTERWEGS_KEYSTORE_PASSWORD_OP_REF=op://<vault>/<item>/<field> in .env.local}"
ALIAS="upload"

ref="${UNTERWEGS_KEYSTORE_OP_REF#op://}"
VAULT="${ref%%/*}"
rest="${ref#*/}"
ITEM="${rest%%/*}"
FIELD="${rest#*/}"   # [<section>/]<field>
ASSIGN="${FIELD/\//.}" # op item edit writes a section as <section>.<field>

if op read "$UNTERWEGS_KEYSTORE_OP_REF" >/dev/null 2>&1; then
  echo "$UNTERWEGS_KEYSTORE_OP_REF already exists: the key must not be replaced." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
KEYSTORE_PASSWORD="$(op read "$UNTERWEGS_KEYSTORE_PASSWORD_OP_REF")"
export KEYSTORE_PASSWORD

# PKCS12 uses one password for store and key; :env keeps it out of the process list.
keytool -genkeypair -storetype PKCS12 -keystore "$TMP/upload.keystore" -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Unterwegs" \
  -storepass:env KEYSTORE_PASSWORD -keypass:env KEYSTORE_PASSWORD >/dev/null 2>&1

SHA256="$(keytool -list -v -keystore "$TMP/upload.keystore" -storepass:env KEYSTORE_PASSWORD -alias "$ALIAS" |
  awk '/SHA256:/ {print $2}')"

op item edit "$ITEM" --vault "$VAULT" "$ASSIGN[file]=$TMP/upload.keystore" "alias[text]=$ALIAS" \
  "certificate sha256[text]=$SHA256" >/dev/null

echo "Attached the keystore as $FIELD to \"$ITEM\" in $VAULT. Add to .env.local:"
echo "  UNTERWEGS_UPLOAD_CERT_SHA256=$SHA256"
echo "Then keep a second copy outside 1Password (docs/RELEASING.md)."
