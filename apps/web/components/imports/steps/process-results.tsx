"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiPost, apiGet } from "@/lib/api-client";
import type { ProcessResult, ThresholdData } from "@/types/api";
import { cn } from "@/lib/utils";

interface ProcessResultsProps {
  customsFileId: string;
  importerId: string;
  importerName: string;
  onReset: () => void;
}

const statusColors: Record<string, string> = {
  safe: "bg-green-100 text-green-800",
  warning_80: "bg-yellow-100 text-yellow-800",
  warning_90: "bg-orange-100 text-orange-800",
  exceeded: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  safe: "Safe",
  warning_80: "80% Warning",
  warning_90: "90% Warning",
  exceeded: "Exceeded",
};

export function ProcessResults({
  customsFileId,
  importerId,
  importerName,
  onReset,
}: ProcessResultsProps) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [threshold, setThreshold] = useState<ThresholdData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);

    try {
      const processResult = await apiPost<ProcessResult>(
        `/api/imports/${customsFileId}/process`,
        {}
      );
      setResult(processResult);

      const year = new Date().getFullYear();
      const thresholdData = await apiGet<ThresholdData>(
        `/api/importers/${importerId}/threshold?year=${year}`
      );
      setThreshold(thresholdData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  if (!result && !processing) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <p className="text-lg font-medium">
            Ready to process file for <strong>{importerName}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            This will parse the CSV, match CBAM rules, and compute threshold impact.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleProcess} size="lg">
            Process File
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (processing) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="font-medium">Processing customs file...</p>
          <p className="text-sm text-muted-foreground">
            Parsing CSV, matching CBAM rules, computing thresholds
          </p>
        </CardContent>
      </Card>
    );
  }

  const isSuccess = result && result.status === "processed";

  return (
    <div className="space-y-4">
      <Card className={cn(isSuccess ? "border-accent" : "border-destructive")}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-accent" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {isSuccess ? "Processing Complete" : "Processing Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{result?.processedRows ?? 0}</p>
              <p className="text-xs text-muted-foreground">Rows Processed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">
                {result?.errorCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
            <div>
              <Badge
                className={cn(
                  "text-sm",
                  isSuccess ? "bg-accent text-accent-foreground" : ""
                )}
                variant={isSuccess ? "default" : "destructive"}
              >
                {result?.status}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Status</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {threshold && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Threshold Impact ({threshold.year})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">CBAM Mass</span>
              <span className="font-bold">
                {threshold.cbam_mass_kg.toLocaleString()} kg /{" "}
                {threshold.threshold_kg.toLocaleString()} kg
              </span>
            </div>
            <Progress
              value={Math.min(
                (threshold.cbam_mass_kg / threshold.threshold_kg) * 100,
                100
              )}
              className="h-3"
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {((threshold.cbam_mass_kg / threshold.threshold_kg) * 100).toFixed(1)}%
                of threshold
              </span>
              <Badge className={statusColors[threshold.status]}>
                {statusLabels[threshold.status] ?? threshold.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onReset}>
          Import Another File
        </Button>
        <Button asChild>
          <Link href={`/dashboard/importers/${importerId}`}>View Importer</Link>
        </Button>
      </div>
    </div>
  );
}
