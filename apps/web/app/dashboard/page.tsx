"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Bell, FileUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/threshold/status-badge";
import { ThresholdGauge } from "@/components/threshold/threshold-gauge";
import { apiGet } from "@/lib/api-client";
import type { Importer, ThresholdData, Alert } from "@/types/api";

interface ImporterWithThreshold extends Importer {
  threshold: ThresholdData | null;
}

export default function DashboardPage() {
  const [importers, setImporters] = useState<ImporterWithThreshold[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const year = new Date().getFullYear();

    apiGet<Importer[]>("/api/importers")
      .then(async (list) => {
        const withThreshold = await Promise.all(
          list.map(async (imp) => {
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
        setImporters(withThreshold);

        let totalAlerts = 0;
        await Promise.all(
          list.map(async (imp) => {
            try {
              const alerts = await apiGet<Alert[]>(
                `/api/importers/${imp.id}/alerts?limit=100`
              );
              totalAlerts += alerts.filter((a) => !a.resolved_at).length;
            } catch {
              // skip
            }
          })
        );
        setAlertCount(totalAlerts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your CBAM compliance status."
        actions={
          <Button asChild>
            <Link href="/dashboard/imports/new">
              <FileUp className="mr-2 h-4 w-4" />
              New Import
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{importers.length}</p>
                  <p className="text-sm text-muted-foreground">Importers</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{alertCount}</p>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Files Processed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {importers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="font-medium">No importers yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create an importer to start tracking CBAM thresholds.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Importers</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
                {importers.map((imp) => (
                  <Link key={imp.id} href={`/dashboard/importers/${imp.id}`}>
                    <Card className="cursor-pointer transition-shadow hover:shadow-md h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {imp.legal_name}
                          </CardTitle>
                          {imp.threshold && (
                            <StatusBadge status={imp.threshold.status} />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          EORI: {imp.eori}
                        </p>
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
          )}
        </div>
      )}
    </>
  );
}
