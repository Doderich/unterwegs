# AdventureLog API schema

Exported from the live server on 02.11.2026 (AdventureLog **v0.13.1**, container `adventurelog`).

| File | What |
|---|---|
| `swagger.json` | drf-yasg Swagger 2.0, generated with `public=True` (all endpoints, not only those visible to an anonymous user) |
| `openapi.json` | Converted to OpenAPI 3 with `swagger2openapi --patch` |
| `adventurelog.d.ts` | TypeScript types from `openapi-typescript`; copied to `src/api/generated.ts` by the generation script |

`manage.py generate_swagger` fails on this image (`SWAGGER_SETTINGS["DEFAULT_INFO"]` misconfigured), and `/docs/` isn't reachable through the public domain. So the export goes through the Django shell.

## Re-export (on the VPN)

```sh
cd docs/api
ssh <server> 'docker exec -i adventurelog sh -c "cd /code && python manage.py shell 2>/dev/null"' > swagger.raw <<'EOF'
import sys
from drf_yasg.generators import OpenAPISchemaGenerator
from drf_yasg import openapi
from drf_yasg.codecs import OpenAPICodecJson
g = OpenAPISchemaGenerator(openapi.Info(title="AdventureLog API", default_version="v0.13.1"), url="https://adventurelog.example.org/")
sys.stdout.write(OpenAPICodecJson(validators=[]).encode(g.get_schema(request=None, public=True)).decode())
EOF
python3 - <<'PYTHON'
import json
from pathlib import Path
raw = Path('swagger.raw').read_text()
schema = json.loads(raw[raw.index('{"swagger"'):raw.rindex('}') + 1])
Path('swagger.json').write_text(json.dumps(schema, indent=2) + '\n')
Path('swagger.raw').unlink()
PYTHON
cd ../..
npm run generate:api
```

The generation script also disambiguates duplicate `operationId` values before generating TypeScript. Keep the exported baseline date above until a new server export is actually taken. Check exported URLs/samples for privacy before committing; runtime response contracts live in `src/api/schemas.ts` and [SERVER.md](../SERVER.md).

## Known gaps

- Only `UltraSlimCollection` is in the schema; the full collection detail (`GET /api/collections/{id}/`) is not typed.
- `CollectionItineraryItem.item` is polymorphic (by `content_type`); it is typed loosely.
- The security definition only says `Basic`. Real auth is `X-API-Key: al_…` or a session.
- Integration/auth management descriptions are incomplete: runtime response schemas deliberately discard returned Immich secrets, Endurain connect may return an MFA challenge, and the pinned Immich update handler is used with PUT. See [integration management](../SERVER.md#managing-integrations).
- The allauth email/MFA APIs have a separate session flow and are not covered by DRF's API-key security configuration. Successful SSO/key issuance does not establish that every endpoint accepts the key.
- `smoke:write` covers selected parity operations, not all writes. Destructive account/integration testing needs disposable credentials and targets; see [testing commands](../ROADMAP.md#testing-commands).
