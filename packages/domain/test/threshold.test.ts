import { describe, expect, it } from "vitest";
import { buildThresholdAlerts, computeThresholdSnapshot } from "../src/threshold";

describe("threshold calculations", () => {
  it("calculates snapshot status by year", () => {
    const snapshot = computeThresholdSnapshot(
      [
        {
          importerEori: "DE123",
          cnCode: "7208",
          netMassKg: 41_000,
          originCountry: "DE",
          declarationDate: new Date("2026-01-10T00:00:00.000Z"),
          procedureCode: "4000",
          cbamScope: true,
          sourceRowNumber: 2
        },
        {
          importerEori: "DE123",
          cnCode: "7208",
          netMassKg: 10_000,
          originCountry: "DE",
          declarationDate: new Date("2026-02-10T00:00:00.000Z"),
          procedureCode: "4000",
          cbamScope: false,
          sourceRowNumber: 3
        }
      ],
      2026
    );
    expect(snapshot.cbamMassKg).toBe(41_000);
    expect(snapshot.status).toBe("warning_80");
  });

  it("emits alerts when crossing boundaries", () => {
    const alerts = buildThresholdAlerts(39_000, 51_000);
    expect(alerts.map((a) => a.status)).toEqual(["warning_80", "warning_90", "exceeded"]);
  });
});
