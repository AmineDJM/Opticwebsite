"use server";

import { resolve } from "node:path";
import { prisma } from "@optic/database";
import { buildExport } from "@optic/exporter";
import { requirePlatform } from "../session.js";

/**
 * Generate & export a website's source code (§42). Runs the exporter, records an
 * ExportJob, and returns the archive path. Platform-admin only.
 */
export type ExportState = { ok: boolean; error?: string; zipPath?: string; fileCount?: number; sizeMb?: number; packages?: number };

export async function generateExportAction(slug: string): Promise<ExportState> {
  await requirePlatform();
  const website = await prisma.website.findUnique({ where: { slug }, select: { id: true, slug: true } });
  if (!website) return { ok: false, error: "Site introuvable" };

  const job = await prisma.exportJob.create({ data: { websiteId: website.id, status: "RUNNING", startedAt: new Date() } });
  try {
    // The generator runs from apps/generator; the monorepo root is two levels up.
    const monorepoRoot = resolve(process.cwd(), "../..");
    const outBase = process.env.EXPORT_OUTPUT_DIR ?? resolve(monorepoRoot, "exports");
    const outDir = resolve(outBase, website.slug);

    const result = await buildExport({ websiteId: website.id, monorepoRoot, outDir, zip: true });

    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", finishedAt: new Date(), outputPath: result.zipPath ?? result.outDir, sizeBytes: result.sizeBytes, manifest: result.manifest as never },
    });

    return { ok: true, zipPath: result.zipPath, fileCount: result.fileCount, sizeMb: Math.round((result.sizeBytes / 1024 / 1024) * 10) / 10, packages: result.packages.length };
  } catch (e) {
    await prisma.exportJob.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: e instanceof Error ? e.message : "Erreur" } });
    return { ok: false, error: e instanceof Error ? e.message : "Erreur lors de l'export" };
  }
}
