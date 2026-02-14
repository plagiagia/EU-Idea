"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/threshold/status-badge";
import { ThresholdGauge } from "@/components/threshold/threshold-gauge";
import { apiGet } from "@/lib/api-client";
import type { Importer, ThresholdData } from "@/types/api";

interface ImporterWithThreshold extends Importer {
  threshold: ThresholdData | null;
}

export default function ImportersPage() {
  const [items, setItems] = useState<ImporterWithThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const year = new Date().getFullYear();

    apiGet<Importer[]>("/api/importers")
      .then(async (importers) => {
        const withThreshold = await Promise.all(
          importers.map(async (imp) => {
            try {
              const threshold = await apiGet<ThresholdData>(
                `/api/importers/${imp.id}/threshold?year=${year}`
              );
              return { ...imp, threshold };
            } catch {
              return { ...imp, threshold: null };
            }
          })
        );
        setItems(withThreshold);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Importers"
        description="Monitor CBAM threshold status for each importer."
      />

      {loading && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {error && <p className="text-destructive">{error}</p>}

      {!loading && items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No importers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create an importer via the API to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {items.map((imp) => (
          <Link key={imp.id} href={`/dashboard/importers/${imp.id}`}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{imp.legal_name}</CardTitle>
                  {imp.threshold && <StatusBadge status={imp.threshold.status} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">EORI: {imp.eori}</p>
                {imp.ms_established && (
                  <p className="text-sm text-muted-foreground">
                    Established: {imp.ms_established}
                  </p>
                )}
                {imp.threshold && (
                  <ThresholdGauge
                    currentKg={imp.threshold.cbam_mass_kg}
                    thresholdKg={imp.threshold.threshold_kg}
                    status={imp.threshold.status}
                  />
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
