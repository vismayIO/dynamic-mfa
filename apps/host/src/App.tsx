import { Suspense, lazy } from "react";
import { Button } from "@workspace/ui-sdk/components/ui/button";

const RemoteMfaRegister = lazy(() =>
  import("remoteApp/MfaRegister").catch(() => ({
    default: () => (
      <p className="read-the-docs">
        Remote module unavailable. Start the remote app to render it here.
      </p>
    ),
  })),
);

function App() {
  return (
    <>
      <h1>Host + Module Federation</h1>
      <div className="card">
        <p>
          Loading federated module <code>remoteApp/MfaRegister</code>
        </p>
        <Button type="button" style={{ marginBottom: 16 }}>
          UI SDK Button
        </Button>
        <Suspense fallback={<p>Loading remote module...</p>}>
          <RemoteMfaRegister />
        </Suspense>
      </div>
    </>
  );
}

export default App;
