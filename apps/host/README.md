# Host App (Low-Code Composer)

Host is a Webpack 5 app that dynamically loads remote components via Module Federation.

## Scripts

- `bun run dev`: starts host at `http://localhost:3000`
- `bun run build`: type-checks and produces `dist/`

## Build-Time Environment

Copy from `.env.example` and set values in your build environment:

- `REMOTE_WIDGET_ENTRY_URL`
  Example CDN-friendly path:
  `/remotes/remote-widget/remoteEntry.js`
  Or absolute URL:
  `https://cdn.example.com/remotes/remote-widget/remoteEntry.js`
- `REMOTE_WIDGET_SCOPE`
  Must match remote federation `name` (default `remoteWidget`)
- `MODULE_REGISTRY_API_URL`
  Optional runtime endpoint for dynamic module registry.
  Example: `https://api.example.com/modules?env=prod`
- `MODULE_REGISTRY_API_KEY`
  Optional API key sent as `x-api-key`

Webpack injects these at build time and the component registry uses them.

## Dynamic Registry API Shape

If `MODULE_REGISTRY_API_URL` is set, host fetches modules at runtime.

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

If the API fails or returns invalid items, host falls back to static registry defaults.

## Deployment Output

Deploy everything under `apps/host/dist/` to S3 behind CloudFront.

Required host artifacts:

- `index.html`
- `main.js`
- chunk files like `*.js` and `*.js.LICENSE.txt`
