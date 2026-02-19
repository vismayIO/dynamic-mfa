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

Webpack injects these at build time and the component registry uses them.

## Deployment Output

Deploy everything under `apps/host/dist/` to S3 behind CloudFront.

Required host artifacts:

- `index.html`
- `main.js`
- chunk files like `*.js` and `*.js.LICENSE.txt`
