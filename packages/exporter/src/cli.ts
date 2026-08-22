import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
for (const c of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(c)) { loadEnv({ path: c }); break; }
}
import { prisma } from "@optic/database";
import { buildExport } from "./build.js";

/** CLI: pnpm export:site -- <website-slug> [outDir] */
async function main() {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: pnpm export:site -- <website-slug> [outDir]"); process.exit(1); }
  const website = await prisma.website.findUnique({ where: { slug }, select: { id: true, slug: true } });
  if (!website) { console.error(`No website with slug "${slug}"`); process.exit(1); }

  const monorepoRoot = resolve(process.cwd(), "../..");
  const outDir = process.argv[3] ?? resolve(process.env.EXPORT_OUTPUT_DIR ?? resolve(monorepoRoot, "exports"), slug);

  console.info(`Exporting "${slug}" → ${outDir}`);
  const result = await buildExport({ websiteId: website.id, monorepoRoot, outDir, zip: true });
  console.info(`✅ Export complete: ${result.fileCount} files, ${(result.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
  console.info(`   Packages: ${result.packages.length}`);
  if (result.zipPath) console.info(`   Archive: ${result.zipPath}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
