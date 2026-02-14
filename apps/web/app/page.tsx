import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const coreCapabilities = [
  "CSV ingestion + strict schema validation",
  "Versioned CBAM CN-scope rules with effective dates",
  "50-tonne yearly threshold snapshots + 80/90/100 alerts",
  "Authorisation app workflow, docs vault, ZIP pack generator",
  "Immutable SHA-256 hashes and full audit trail",
  "Stripe plans with importer/client quotas"
];

const stats = [
  {
    title: "Threshold Logic",
    metric: "50,000 kg",
    description: "Calendar-year cumulative CBAM net mass by importer with deterministic calculations."
  },
  {
    title: "Core API",
    metric: "12 routes",
    description:
      "Includes ingestion, processing, threshold/alerts, authorisation docs, billing, and cron."
  },
  {
    title: "Auditability",
    metric: "SHA-256",
    description: "Every file and generated package is hash-tracked with actor/time metadata."
  }
];

export default function HomePage() {
  return (
    <main className="container max-w-[1100px] mx-auto px-6 py-6">
      <section className="rounded-3xl border bg-gradient-to-br from-white via-[#f8faf9] to-[#eff8f4] p-7 shadow-lg">
        <Badge variant="secondary" className="mb-4 bg-[#eef7f2] text-accent hover:bg-[#eef7f2]">
          Broker-first MVP
        </Badge>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-bold leading-tight mb-2.5">
          CBAM Threshold Tracker + Authorisation Kit
        </h1>
        <p className="text-muted-foreground max-w-[700px]">
          Upload customs exports and get deterministic CBAM scope detection, real-time progress
          toward the 50,000 kg annual threshold, and an audit-ready authorisation pack workflow.
        </p>
        <div className="mt-5 flex gap-2.5 flex-wrap">
          <Button asChild>
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/api/admin/cbam-rules">View Rules API</Link>
          </Button>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary mb-2">{stat.metric}</p>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Implemented MVP Modules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {coreCapabilities.map((item) => (
            <div key={item} className="text-sm">
              - {item}
            </div>
          ))}
          <p className="mt-4 text-sm text-muted-foreground">
            Auth model: Supabase magic-link identity with role checks in API handlers.
          </p>
          <p className="text-sm text-muted-foreground">
            Dev note: set <code className="rounded-md bg-muted px-1.5 py-0.5">apps/web/.env.local</code> before
            calling authenticated routes.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
