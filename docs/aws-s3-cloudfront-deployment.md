# AWS S3 + CloudFront Deployment (POC)

## Deployment Model

- Deploy host and remotes as independent static sites.
- Host reads remote container URL at build time (`REMOTE_WIDGET_ENTRY_URL`).
- Remote exposes `remoteEntry.js` and chunks with `publicPath: "auto"`.

## Example CloudFront Paths

- Host app:
  `https://app.example.com/`
- Remote widget:
  `https://cdn.example.com/remotes/remote-widget/remoteEntry.js`

For path-based routing on the same distribution:

- Host: `https://app.example.com/`
- Remote: `https://app.example.com/remotes/remote-widget/remoteEntry.js`
- Host build env:
  `REMOTE_WIDGET_ENTRY_URL=/remotes/remote-widget/remoteEntry.js`

## Required Build Outputs

### Host (`apps/host/dist`)

- `index.html`
- `main.js`
- all host chunks (`*.js`, `*.js.LICENSE.txt`)

### Remote (`apps/remote-widget/dist`)

- `remoteEntry.js`
- all remote chunks (`*.js`, `*.js.LICENSE.txt`)
- optional `index.html` for direct remote preview
