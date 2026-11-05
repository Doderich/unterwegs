#!/usr/bin/env bash
# Regenerate API types from docs/api/swagger.json (export: see docs/api/README.md).
set -euo pipefail
cd "$(dirname "$0")/../docs/api"
npx -y swagger2openapi@7 --patch -o openapi.json swagger.json
# drf-yasg emits duplicate operationIds (e.g. api_regions_list); make them unique or the TS output won't compile.
python3 - <<'PY'
import json
d = json.load(open('openapi.json'))
seen = {}
for path, ops in d['paths'].items():
    for method, op in ops.items():
        if not isinstance(op, dict) or 'operationId' not in op:
            continue
        oid = op['operationId']
        if oid in seen:
            seen[oid] += 1
            op['operationId'] = f"{oid}_{seen[oid]}"
        else:
            seen[oid] = 1
json.dump(d, open('openapi.json', 'w'), indent=2)
PY
npx -y openapi-typescript@7 openapi.json -o adventurelog.d.ts
{
  echo "// Generated from docs/api/openapi.json by scripts/generate-api-types.sh. Do not edit."
  cat adventurelog.d.ts
} > ../../src/api/generated.ts
