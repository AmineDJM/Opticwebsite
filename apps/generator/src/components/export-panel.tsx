"use client";

import { useState, useTransition } from "react";
import { Download, Package, Check, Loader2 } from "lucide-react";
import { Card, Button, Alert } from "@optic/ui";
import { generateExportAction, type ExportState } from "../server/actions/export.js";

/** Export panel (§42, Scenario D). Triggers the source-code export and shows the result. */
export function ExportPanel({ slug, recentJobs }: { slug: string; recentJobs: { id: string; status: string; sizeBytes: number | null; createdAt: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ExportState | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => setResult(await generateExportAction(slug)));
  }

  return (
    <Card variant="bordered" padded>
      <h2 className="mb-1 flex items-center gap-2 font-heading text-lg font-semibold"><Package size={18} /> Export du code source</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Générez un projet complet et autonome (frontend, backend, base de données, docs).
        Un développeur peut l&apos;installer et l&apos;héberger sans dépendre de cette plateforme.
      </p>

      <Button onClick={run} loading={pending} disabled={pending}>
        {pending ? <><Loader2 className="animate-spin" size={16} /> Génération…</> : <><Download size={16} /> Generate / Export Website</>}
      </Button>

      {result?.ok && (
        <Alert variant="success" className="mt-4">
          <div>
            <p className="flex items-center gap-1 font-medium"><Check size={16} /> Export généré</p>
            <p className="mt-1 text-sm">{result.fileCount} fichiers · {result.sizeMb} Mo · {result.packages} packages</p>
            {result.zipPath && <p className="mt-1 break-all text-xs text-muted-foreground">Archive : {result.zipPath}</p>}
            <p className="mt-2 text-xs text-muted-foreground">Le README et DEPLOYMENT.md inclus expliquent l&apos;installation complète.</p>
          </div>
        </Alert>
      )}
      {result && !result.ok && <Alert variant="error" className="mt-4">{result.error}</Alert>}

      {recentJobs.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Exports récents</p>
          <ul className="space-y-1 text-sm">
            {recentJobs.map((j) => (
              <li key={j.id} className="flex justify-between text-muted-foreground">
                <span>{new Date(j.createdAt).toLocaleString("fr-DZ")}</span>
                <span>{j.status === "COMPLETED" ? `${((j.sizeBytes ?? 0) / 1024 / 1024).toFixed(1)} Mo` : j.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
