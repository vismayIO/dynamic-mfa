import { Link } from "react-router-dom";

export function NewPage() {
  return (
    <main className="composer-shell" style={{ placeItems: "center", minHeight: "100dvh" }}>
      <section className="composer-state-preview" style={{ width: "min(720px, 92vw)" }}>
        <h1>New Page</h1>
        <p>This page is ready. Share what should be built here next.</p>
        <p>
          <Link to="/">Back to Home</Link>
        </p>
      </section>
    </main>
  );
}
