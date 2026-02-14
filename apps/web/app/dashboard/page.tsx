const routes = [
  "POST /api/imports/upload",
  "POST /api/imports/{id}/map",
  "POST /api/imports/{id}/process",
  "GET /api/importers/{id}/threshold?year=YYYY",
  "GET /api/importers/{id}/alerts",
  "POST /api/importers/{id}/auth-app",
  "POST /api/auth-app/{id}/documents",
  "POST /api/auth-app/{id}/pack",
  "GET /api/audit?importer_id=...",
  "POST /api/billing/checkout",
  "POST /api/billing/webhook",
  "GET|POST /api/admin/cbam-rules"
];

export default function DashboardPage() {
  return (
    <main className="container">
      <section className="hero">
        <span className="badge">Implementation Status</span>
        <h1>MVP Technical Dashboard</h1>
        <p>
          This workspace is scaffolded for broker multi-client operations, deterministic compliance
          logic, and auditable API workflows.
        </p>
      </section>

      <section className="grid">
        {routes.map((route) => (
          <article className="card" key={route}>
            <h3>{route}</h3>
            <p>Ready in the Next.js App Router API layer.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
