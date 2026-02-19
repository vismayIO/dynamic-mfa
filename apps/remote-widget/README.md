# Remote Widget (Module Federation Template)

This app is a reusable template for remote UI modules that expose a single `Widget` component.

## Exposed Module

- Remote scope: `remoteWidget` (override with `REMOTE_NAME`)
- Exposed path: `./Widget`
- Entry file: `remoteEntry.js`

## Scripts

- `bun run dev`: starts remote on `http://localhost:3001`
- `bun run build`: type-checks and builds production assets

## Build-Time Environment

Copy from `.env.example` and set in CI/build:

- `REMOTE_NAME`: federation container scope (default `remoteWidget`)
- `PORT`: dev server port (default `3001`)

## Deployment Output

Deploy everything under `apps/remote-widget/dist/` independently from host.

Required remote artifacts:

- `remoteEntry.js`
- all generated chunks like `*.js` and `*.js.LICENSE.txt`

## Notes

- Host URLs are not hardcoded in the remote config.
- `publicPath` is set to `auto` so the remote container resolves assets from its served origin.
