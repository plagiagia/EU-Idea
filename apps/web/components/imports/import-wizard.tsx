"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SelectImporter } from "./steps/select-importer";
import { FileUpload } from "./steps/file-upload";
import { ColumnMapping } from "./steps/column-mapping";
import { ProcessResults } from "./steps/process-results";
import type { ProcessResult } from "@/types/api";
import { cn } from "@/lib/utils";

type Step = "select-importer" | "upload" | "map-columns" | "process";

const steps: { key: Step; label: string }[] = [
  { key: "select-importer", label: "Select Importer" },
  { key: "upload", label: "Upload CSV" },
  { key: "map-columns", label: "Map Columns" },
  { key: "process", label: "Process" },
];

interface WizardState {
  step: Step;
  importerId: string | null;
  importerName: string | null;
  customsFileId: string | null;
  csvHeaders: string[];
  processResult: ProcessResult | null;
}

const initialState: WizardState = {
  step: "select-importer",
  importerId: null,
  importerName: null,
  customsFileId: null,
  csvHeaders: [],
  processResult: null,
};

export function ImportWizard() {
  const [state, setState] = useState<WizardState>(initialState);

  const currentIndex = steps.findIndex((s) => s.key === state.step);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <Separator className="w-8" />}
            <Badge
              variant={i <= currentIndex ? "default" : "outline"}
              className={cn(
                "whitespace-nowrap",
                i < currentIndex && "bg-accent text-accent-foreground",
                i === currentIndex && "bg-primary text-primary-foreground"
              )}
            >
              {i + 1}. {s.label}
            </Badge>
          </div>
        ))}
      </div>

      {state.step === "select-importer" && (
        <SelectImporter
          onSelect={(importerId, importerName) =>
            setState((s) => ({ ...s, step: "upload", importerId, importerName }))
          }
        />
      )}

      {state.step === "upload" && state.importerId && (
        <FileUpload
          importerId={state.importerId}
          onUploaded={(customsFileId, csvHeaders) =>
            setState((s) => ({ ...s, step: "map-columns", customsFileId, csvHeaders }))
          }
        />
      )}

      {state.step === "map-columns" && state.customsFileId && (
        <ColumnMapping
          customsFileId={state.customsFileId}
          csvHeaders={state.csvHeaders}
          onMapped={() => setState((s) => ({ ...s, step: "process" }))}
        />
      )}

      {state.step === "process" && state.customsFileId && state.importerId && (
        <ProcessResults
          customsFileId={state.customsFileId}
          importerId={state.importerId}
          importerName={state.importerName ?? ""}
          onReset={() => setState(initialState)}
        />
      )}
    </div>
  );
}
