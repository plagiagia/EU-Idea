"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiPost } from "@/lib/api-client";
import { requiredCanonicalFields, type SourceMapping, type MassUnit } from "@cbam/domain/types";
import type { MapImportBody } from "@/types/contracts";

interface ColumnMappingProps {
  customsFileId: string;
  csvHeaders: string[];
  onMapped: () => void;
}

const fieldDescriptions: Record<string, string> = {
  importer_eori: "EORI number (e.g. DE1234567890)",
  cn_code: "Combined Nomenclature code (e.g. 72061000)",
  net_mass_kg: "Net mass value",
  origin_country: "ISO-2 country of origin (e.g. CN, TR)",
  declaration_date: "Declaration date (YYYY-MM-DD)",
  procedure_code: "Customs procedure code",
  mass_unit: "Optional: per-row unit column (kg, g, t)",
  default_mass_unit: "Default unit if no per-row column",
};

const autoDetectRules: Record<string, RegExp> = {
  importer_eori: /eori|importer/i,
  cn_code: /cn.?code|commodity|nomenclature|hs.?code/i,
  net_mass_kg: /mass|weight|kg|net/i,
  origin_country: /origin|country/i,
  declaration_date: /date|declaration/i,
  procedure_code: /procedure|proc/i,
};

const allFields = [...requiredCanonicalFields, "mass_unit"] as const;

export function ColumnMapping({ customsFileId, csvHeaders, onMapped }: ColumnMappingProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultMassUnit, setDefaultMassUnit] = useState<MassUnit | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRequiredMapped = requiredCanonicalFields.every((f) => mapping[f]);

  const handleAutoDetect = () => {
    const detected: Record<string, string> = {};
    for (const [field, regex] of Object.entries(autoDetectRules)) {
      const match = csvHeaders.find((h) => regex.test(h));
      if (match) detected[field] = match;
    }
    setMapping((prev) => ({ ...prev, ...detected }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const sourceMapping: SourceMapping = {
        importer_eori: mapping.importer_eori,
        cn_code: mapping.cn_code,
        net_mass_kg: mapping.net_mass_kg,
        origin_country: mapping.origin_country,
        declaration_date: mapping.declaration_date,
        procedure_code: mapping.procedure_code,
      };

      if (mapping.mass_unit) {
        sourceMapping.mass_unit = mapping.mass_unit;
      }

      if (defaultMassUnit) {
        sourceMapping.default_mass_unit = defaultMassUnit;
      }

      const body: MapImportBody = { mapping: sourceMapping };
      await apiPost(`/api/imports/${customsFileId}/map`, body);
      onMapped();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mapping failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Map CSV Columns</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAutoDetect}>
              Auto-detect
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {allFields.map((field) => {
            const isRequired = requiredCanonicalFields.includes(field as any);
            return (
              <div key={field} className="grid grid-cols-[200px_1fr] items-center gap-4">
                <Label className="flex items-center gap-1.5">
                  {field}
                  {isRequired && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                      required
                    </Badge>
                  )}
                </Label>
                <div>
                  <Select
                    value={mapping[field] || ""}
                    onValueChange={(v) =>
                      setMapping((prev) => ({ ...prev, [field]: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={fieldDescriptions[field]} />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-[200px_1fr] items-center gap-4">
            <Label>default_mass_unit</Label>
            <Select
              value={defaultMassUnit}
              onValueChange={(v) => setDefaultMassUnit(v as MassUnit)}
            >
              <SelectTrigger>
                <SelectValue placeholder={fieldDescriptions.default_mass_unit} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg (kilograms)</SelectItem>
                <SelectItem value="g">g (grams)</SelectItem>
                <SelectItem value="t">t (tonnes)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!allRequiredMapped || saving}>
          {saving ? "Saving..." : "Save Mapping & Continue"}
        </Button>
      </div>
    </div>
  );
}
