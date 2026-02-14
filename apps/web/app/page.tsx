const coreCapabilities = [
  "CSV ingestion + strict schema validation",
  "Versioned CBAM CN-scope rules with effective dates",
  "50-tonne yearly threshold snapshots + 80/90/100 alerts",
  "Authorisation app workflow, docs vault, ZIP pack generator",
  "Immutable SHA-256 hashes and full audit trail",
  "Stripe plans with importer/client quotas"
];

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <span className="badge">Broker-first MVP</span>
        <h1>CBAM Threshold Tracker + Authorisation Kit</h1>
        <p>
          Upload customs exports and get deterministic CBAM scope detection, real-time progress
          toward the 50,000 kg annual threshold, and an audit-ready authorisation pack workflow.
        </p>
        <div className="actions">
          <a className="button" href="/dashboard">
            Open Dashboard
          </a>
          <a className="button secondary" href="/api/admin/cbam-rules">
            View Rules API
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h3>Threshold Logic</h3>
          <p className="metric">50,000 kg</p>
          <p>Calendar-year cumulative CBAM net mass by importer with deterministic calculations.</p>
        </article>
        <article className="card">
          <h3>Core API</h3>
          <p className="metric">12 routes</p>
          <p>
            Includes ingestion, processing, threshold/alerts, authorisation docs, billing, and cron.
          </p>
        </article>
        <article className="card">
          <h3>Auditability</h3>
          <p className="metric">SHA-256</p>
          <p>Every file and generated package is hash-tracked with actor/time metadata.</p>
        </article>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h3>Implemented MVP Modules</h3>
        <div className="stack">
          {coreCapabilities.map((item) => (
            <div key={item}>- {item}</div>
          ))}
        </div>
        <p style={{ marginTop: 16, color: "#476176" }}>
          Auth model: Supabase magic-link identity with role checks in API handlers.
        </p>
        <p style={{ color: "#476176" }}>
          Dev note: set <code>apps/web/.env.local</code> before calling authenticated routes.
        </p>
      </section>
    </main>
  );
}
