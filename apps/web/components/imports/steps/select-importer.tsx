"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api-client";
import type { Importer } from "@/types/api";
import { cn } from "@/lib/utils";

interface SelectImporterProps {
  onSelect: (importerId: string, importerName: string) => void;
}

export function SelectImporter({ onSelect }: SelectImporterProps) {
  const [importers, setImporters] = useState<Importer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Importer[]>("/api/importers")
      .then(setImporters)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Failed to load importers: {error}</p>;
  }

  if (importers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No importers found. Create an importer first via the Importers page.
        </CardContent>
      </Card>
    );
  }

  const selected = importers.find((imp) => imp.id === selectedId);

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {importers.map((imp) => (
          <Card
            key={imp.id}
            className={cn(
              "cursor-pointer transition-shadow hover:shadow-md",
              selectedId === imp.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedId(imp.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{imp.legal_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">EORI: {imp.eori}</p>
              {imp.ms_established && (
                <p className="text-sm text-muted-foreground">
                  Established: {imp.ms_established}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          disabled={!selected}
          onClick={() => selected && onSelect(selected.id, selected.legal_name)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
