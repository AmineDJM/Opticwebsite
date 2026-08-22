"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Card, Alert } from "@optic/ui";

/** Drag/click uploader posting to the media API (§27). Copies the URL on success. */
export function MediaUploader() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null); setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Échec de l'import"); break; }
        setLastUrl(data.url);
      }
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card variant="bordered" padded>
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      {lastUrl && <Alert variant="success" className="mb-3">Importé : <code className="text-xs">{lastUrl}</code></Alert>}
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded border-2 border-dashed border-border py-8 text-center hover:border-primary/50">
        <Upload size={28} className="text-muted-foreground" />
        <span className="text-sm font-medium">{uploading ? "Import en cours…" : "Cliquez pour importer une image"}</span>
        <span className="text-xs text-muted-foreground">JPG, PNG, WebP, SVG — max 8 Mo</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} disabled={uploading} />
      </label>
    </Card>
  );
}
