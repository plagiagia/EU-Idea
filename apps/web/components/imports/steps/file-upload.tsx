"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiPostForm } from "@/lib/api-client";
import type { CustomsFile } from "@/types/api";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  importerId: string;
  onUploaded: (customsFileId: string, csvHeaders: string[]) => void;
}

function extractHeaders(text: string): string[] {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  return firstLine
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

export function FileUpload({ importerId, onUploaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      setHeaders(extractHeaders(text));
      setPreview(lines.slice(0, 6));
    };
    reader.readAsText(f.slice(0, 8192));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".csv")) handleFile(f);
      else setError("Please upload a .csv file.");
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(30);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("importer_id", importerId);
      formData.append("file", file);

      setProgress(60);
      const result = await apiPostForm<CustomsFile>("/api/imports/upload", formData);
      setProgress(100);
      onUploaded(result.id, headers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragOver ? "border-primary bg-primary/5" : "border-border",
          file && "border-accent"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          {file ? (
            <>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Drop your customs CSV here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </>
          )}
        </CardContent>
      </Card>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {preview.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">CSV Preview</p>
            <div className="overflow-x-auto">
              <pre className="text-xs whitespace-pre font-mono">
                {preview.map((line, i) => (
                  <div
                    key={i}
                    className={cn(i === 0 && "font-bold text-foreground")}
                  >
                    {line}
                  </div>
                ))}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {uploading && <Progress value={progress} className="h-2" />}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}
