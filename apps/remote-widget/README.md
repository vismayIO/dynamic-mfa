# Remote Widget (Module Federation Template)

This app is a reusable template for remote UI modules that expose a single `Widget` component.

## Exposed Module

- Remote scope: `remoteWidget` (override with `REMOTE_NAME`)
- Exposed path: `./Widget`
- Entry file: `remoteEntry.js`

## Scripts

- `bun run dev`: starts remote on `http://localhost:3001`
- `bun run build`: type-checks and builds production assets

## Notes

- Host URLs are not hardcoded in the remote config.
- `publicPath` is set to `auto` so the remote container resolves assets from its served origin.
