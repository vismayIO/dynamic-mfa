import Widget from "./Widget";

function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <Widget
        componentId="widget-preview"
        data={{
          title: "Remote Widget Preview",
          description: "This local preview mirrors the federated Widget export.",
          ctaLabel: "Emit Host Event",
        }}
        onEvent={(eventName, payload) => {
          console.log("[remote-widget event]", eventName, payload);
        }}
      />
    </main>
  );
}

export default App;
