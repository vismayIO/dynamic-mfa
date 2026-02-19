# Host App (Low-Code Composer)

Host is a Webpack 5 app that dynamically loads remote components via Module Federation.

## Scripts

- `bun run dev`: starts host at `http://localhost:3000`
- `bun run build`: type-checks and produces `dist/`

## Build-Time Environment

Copy from `.env.example` and set values in your build environment:

- `MODULE_REGISTRY_API_URL`
  Runtime endpoint for module registry.
  Example: `https://api.example.com/modules?env=prod`
- `MODULE_REGISTRY_API_KEY`
  Optional API key sent as `x-api-key`

Webpack injects these at build time and the component registry uses them.

## Dynamic Registry API Shape

Host fetches modules at runtime from `MODULE_REGISTRY_API_URL`.

Accepted payload format:

- `[{...module}]`
- `{ "items": [{...module}] }`

Each module item should include:

- `id` (or `componentId`)
- `displayName`
- `remoteEntryUrl`
- `remoteScope`
- `exposedModule` (example: `./Widget`)
- `defaultLayoutSize` (`{ "width": 6, "height": 4 }`)

If the API fails or returns invalid items, host shows an error and no modules are listed.

## Deployment Output

Deploy everything under `apps/host/dist/` to S3 behind CloudFront.

Required host artifacts:

- `index.html`
- `main.js`
- chunk files like `*.js` and `*.js.LICENSE.txt`
