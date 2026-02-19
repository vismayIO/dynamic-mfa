# Module Registry API (Fastify + TypeScript + DynamoDB)

This service handles custom remote module registration and listing for the host composer.

## Local Run

1. Start local DynamoDB:

```bash
bun run docker:dynamodb:up
```

Note: local DynamoDB runs in-memory for reliability, so data resets when container restarts.

2. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

3. Start API:

```bash
bun run dev
```

The API runs at `http://localhost:4000`.

If `tsx watch` fails on your machine, run:

```bash
bun run dev:nowatch
```

## Endpoints

- `GET /health`
- `GET /modules?tenantId=public&env=local&status=active`
- `POST /modules`
- `POST /modules/upload` (multipart form-data + `archive` `.zip`)
- `PATCH /modules/:componentId/status?tenantId=public&env=local`

If `MODULE_REGISTRY_API_KEY` is set, include `x-api-key` in requests.

## Register Module Example

```bash
curl -X POST http://localhost:4000/modules \
  -H "content-type: application/json" \
  -H "x-api-key: local-dev-key" \
  -d '{
    "componentId": "mfa-register-widget",
    "displayName": "MFA Register Widget",
    "remoteEntryUrl": "http://localhost:3001/remoteEntry.js",
    "remoteScope": "remoteWidget",
    "exposedModule": "./Widget",
    "defaultLayoutSize": { "width": 6, "height": 4 },
    "status": "active",
    "version": "1.0.0",
    "tenantId": "public",
    "env": "local"
  }'
```

## Upload Module Archive Example

```bash
curl -X POST http://localhost:4000/modules/upload \
  -H "x-api-key: local-dev-key" \
  -F "componentId=mfa-register-widget" \
  -F "displayName=MFA Register Widget" \
  -F "remoteScope=remoteWidget" \
  -F "exposedModule=./Widget" \
  -F "remoteEntryPath=remoteEntry.js" \
  -F "defaultLayoutWidth=6" \
  -F "defaultLayoutHeight=4" \
  -F "status=active" \
  -F "version=1.0.0" \
  -F "tenantId=public" \
  -F "env=local" \
  -F "archive=@./dist/module.zip"
```

## Host Integration

Set host env:

```env
MODULE_REGISTRY_API_URL=http://localhost:4000/modules?tenantId=public&env=local&status=active
MODULE_REGISTRY_API_KEY=local-dev-key
```

Then host will fetch modules dynamically and show them in the registry sidebar.

## Quick Troubleshooting

- `API exits on start`:
  - Restart local DynamoDB: `bun run docker:dynamodb:down && bun run docker:dynamodb:up`
  - Ensure Docker DynamoDB is running: `bun run docker:dynamodb:up`
  - Check `DYNAMODB_ENDPOINT` in `.env` (local should be `http://localhost:8000`)
- `Host gets 401 from /modules`:
  - Ensure backend `MODULE_REGISTRY_API_KEY` matches host `MODULE_REGISTRY_API_KEY`
- `Host still not listing modules`:
  - Call API directly and verify items:
    - `curl "http://localhost:4000/modules?tenantId=public&env=local&status=active"`
