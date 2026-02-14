import type { ThresholdStatus } from "@cbam/domain";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ThresholdGaugeProps {
  currentKg: number;
  thresholdKg: number;
  status: ThresholdStatus;
}

const barColors: Record<ThresholdStatus, string> = {
  safe: "[&>div]:bg-green-500",
  warning_80: "[&>div]:bg-yellow-500",
  warning_90: "[&>div]:bg-orange-500",
  exceeded: "[&>div]:bg-red-500",
};

export function ThresholdGauge({ currentKg, thresholdKg, status }: ThresholdGaugeProps) {
  const pct = Math.min((currentKg / thresholdKg) * 100, 100);

  return (
    <div className="space-y-1">
      <Progress value={pct} className={cn("h-2", barColors[status])} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{currentKg.toLocaleString()} kg</span>
        <span>{thresholdKg.toLocaleString()} kg</span>
      </div>
    </div>
  );
}
