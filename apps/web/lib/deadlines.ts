export interface DeadlineReminder {
  code: string;
  date: string;
  daysRemaining: number;
  message: string;
}

function toUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetween(now: Date, target: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.ceil((toUtcDate(target).getTime() - toUtcDate(now).getTime()) / dayMs);
}

export function buildDeadlineReminders(
  now: Date,
  year: number,
  windowDays = 30
): DeadlineReminder[] {
  const deadlines = [
    {
      code: `cbam_provisional_${year}_03_31`,
      date: new Date(Date.UTC(year, 2, 31)),
      message: "CBAM provisional continuation application checkpoint (31 March)."
    },
    {
      code: `cbam_annual_${year}_09_30`,
      date: new Date(Date.UTC(year, 8, 30)),
      message: "CBAM annual declaration and surrender deadline (30 September)."
    }
  ];

  return deadlines
    .map((deadline) => ({
      code: deadline.code,
      date: deadline.date.toISOString().slice(0, 10),
      daysRemaining: daysBetween(now, deadline.date),
      message: deadline.message
    }))
    .filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= windowDays);
}
