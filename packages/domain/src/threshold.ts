import type {
  CanonicalImportLine,
  ThresholdAlert,
  ThresholdSnapshot,
  ThresholdStatus
} from "./types";

export const DEFAULT_THRESHOLD_KG = 50_000;

function toThresholdStatus(ratio: number): ThresholdStatus {
  if (ratio >= 1) return "exceeded";
  if (ratio >= 0.9) return "warning_90";
  if (ratio >= 0.8) return "warning_80";
  return "safe";
}

function getBoundaryRatios(): Array<Exclude<ThresholdStatus, "safe">> {
  return ["warning_80", "warning_90", "exceeded"];
}

function statusToRatio(status: Exclude<ThresholdStatus, "safe">): number {
  if (status === "warning_80") return 0.8;
  if (status === "warning_90") return 0.9;
  return 1;
}

export function buildThresholdAlerts(
  previousKg: number,
  currentKg: number,
  thresholdKg = DEFAULT_THRESHOLD_KG
): ThresholdAlert[] {
  const alerts: ThresholdAlert[] = [];
  const previousRatio = previousKg / thresholdKg;
  const currentRatio = currentKg / thresholdKg;

  for (const status of getBoundaryRatios()) {
    const boundary = statusToRatio(status);
    if (previousRatio < boundary && currentRatio >= boundary) {
      alerts.push({
        status,
        thresholdRatio: boundary,
        previousKg,
        currentKg
      });
    }
  }
  return alerts;
}

export function computeThresholdSnapshot(
  rows: CanonicalImportLine[],
  year: number,
  thresholdKg = DEFAULT_THRESHOLD_KG
): ThresholdSnapshot {
  const totalKg = rows
    .filter((line) => line.cbamScope)
    .filter((line) => line.declarationDate.getUTCFullYear() === year)
    .reduce((sum, line) => sum + line.netMassKg, 0);

  const status = toThresholdStatus(totalKg / thresholdKg);
  return {
    year,
    cbamMassKg: Number(totalKg.toFixed(3)),
    thresholdKg,
    status
  };
}
