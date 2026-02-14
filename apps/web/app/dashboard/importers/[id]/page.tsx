"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileUp, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/threshold/status-badge";
import { ThresholdGauge } from "@/components/threshold/threshold-gauge";
import { apiGet } from "@/lib/api-client";
import type { Importer, ThresholdData, Alert } from "@/types/api";

export default function ImporterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [importer, setImporter] = useState<Importer | null>(null);
  const [threshold, setThreshold] = useState<ThresholdData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      apiGet<Importer[]>("/api/importers").then(
        (list) => list.find((i) => i.id === id) ?? null
      ),
      apiGet<ThresholdData>(`/api/importers/${id}/threshold?year=${year}`).catch(
        () => null
      ),
      apiGet<Alert[]>(`/api/importers/${id}/alerts?limit=20`).catch(() => []),
    ])
      .then(([imp, thr, al]) => {
        setImporter(imp);
        setThreshold(thr);
        setAlerts(al);
      })
      .finally(() => setLoading(false));
  }, [id, year]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!importer) {
    return <p className="text-destructive">Importer not found.</p>;
  }

  const pct = threshold
    ? ((threshold.cbam_mass_kg / threshold.threshold_kg) * 100).toFixed(1)
    : "0.0";

  return (
    <>
      <PageHeader
        title={importer.legal_name}
        description={`EORI: ${importer.eori}${importer.ms_established ? ` · Established: ${importer.ms_established}` : ""}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/imports/new">
                <FileUp className="mr-2 h-4 w-4" />
                Upload File
              </Link>
            </Button>
            <Button variant="outline" disabled>
              <Shield className="mr-2 h-4 w-4" />
              Auth App
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Threshold Overview</CardTitle>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {threshold ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">
                      {threshold.cbam_mass_kg.toLocaleString()} kg
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pct}% of {threshold.threshold_kg.toLocaleString()} kg threshold
                    </p>
                  </div>
                  <StatusBadge status={threshold.status} />
                </div>
                <ThresholdGauge
                  currentKg={threshold.cbam_mass_kg}
                  thresholdKg={threshold.threshold_kg}
                  status={threshold.status}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No threshold data for {year}. Upload and process a customs file to start tracking.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No alerts yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge variant="outline">{alert.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{alert.message}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={alert.resolved_at ? "secondary" : "default"}
                        >
                          {alert.resolved_at ? "Resolved" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
