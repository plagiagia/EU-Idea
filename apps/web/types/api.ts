import type { ThresholdStatus, ImportProcessStatus, AlertType, SourceMapping } from "@cbam/domain";

export interface Importer {
  id: string;
  legal_name: string;
  eori: string;
  ms_established: string | null;
  created_at: string;
}

export interface CustomsFile {
  id: string;
  importer_id: string;
  status: ImportProcessStatus;
  sha256: string;
  created_at: string;
}

export interface SourceMappingRow {
  id: string;
  importer_id: string;
  customs_file_id: string;
  name: string;
  mapping_json: SourceMapping;
}

export interface ProcessResult {
  customsFileId: string;
  importerId: string;
  processedRows: number;
  errorCount: number;
  status: ImportProcessStatus;
}

export interface ThresholdData {
  year: number;
  cbam_mass_kg: number;
  threshold_kg: number;
  status: ThresholdStatus;
  last_computed_at: string | null;
}

export interface Alert {
  id: string;
  type: AlertType;
  status: string;
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
}
