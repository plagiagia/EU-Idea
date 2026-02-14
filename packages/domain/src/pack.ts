import JSZip from "jszip";
import { sha256 } from "./hash";
import type { SubmissionPackInput, SubmissionPackOutput } from "./types";

export async function buildSubmissionPack(
  input: SubmissionPackInput
): Promise<SubmissionPackOutput> {
  const zip = new JSZip();
  const generatedAtIso = input.generatedAt.toISOString();

  const docsManifest = input.documents.map((doc) => {
    const computedSha = doc.sha256 ?? sha256(doc.content);
    return {
      filename: doc.filename,
      contentType: doc.contentType,
      sha256: computedSha
    };
  });

  const manifest = {
    importerId: input.importerId,
    authApplicationId: input.authApplicationId,
    generatedAt: generatedAtIso,
    summary: input.summary,
    documents: docsManifest
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  zip.file("manifest.json", manifestJson);

  input.documents.forEach((doc, idx) => {
    const safeName = doc.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    zip.file(`documents/${idx + 1}-${safeName}`, doc.content);
  });

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return {
    zipBuffer,
    manifestSha256: sha256(manifestJson),
    packageSha256: sha256(zipBuffer)
  };
}
