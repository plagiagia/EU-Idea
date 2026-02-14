import { describe, expect, it } from "vitest";
import { buildSubmissionPack } from "../src/pack";

describe("buildSubmissionPack", () => {
  it("creates zip package and hashes", async () => {
    const result = await buildSubmissionPack({
      importerId: "imp_1",
      authApplicationId: "app_1",
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      summary: { status: "draft" },
      documents: [
        {
          filename: "doc.txt",
          contentType: "text/plain",
          content: Buffer.from("hello")
        }
      ]
    });
    expect(result.zipBuffer.byteLength).toBeGreaterThan(0);
    expect(result.manifestSha256).toHaveLength(64);
    expect(result.packageSha256).toHaveLength(64);
  });
});
