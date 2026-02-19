# React + TypeScript + Webpack Module Federation

This host app runs on Webpack 5 and is configured with Module Federation.

## Scripts

- `bun run dev`: Starts the host on `http://localhost:3000`
- `bun run build`: Type-checks and creates a production bundle

## Remote Configuration

By default, the host expects a remote container at:

`http://localhost:3001/remoteEntry.js`

Override it with:

```bash
REMOTE_APP_URL=http://localhost:3001/remoteEntry.js bun run dev
```

The app lazy-loads `remoteApp/MfaRegister` and shows a local fallback if the remote is unavailable.
