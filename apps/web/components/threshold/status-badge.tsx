import type { ThresholdStatus } from "@cbam/domain";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: ThresholdStatus;
}

const config: Record<ThresholdStatus, { label: string; className: string }> = {
  safe: { label: "Safe", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  warning_80: {
    label: "80% Warning",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  warning_90: {
    label: "90% Warning",
    className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  },
  exceeded: {
    label: "Exceeded",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = config[status] ?? config.safe;
  return <Badge className={cn(className)}>{label}</Badge>;
}
