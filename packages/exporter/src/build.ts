import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createWriteStream } from "node:fs";
import { discoverWorkspace, computeClosure, verifyClosure, type WorkspacePackage } from "./closure.js";
import { extractWebsite, type ExportData } from "./extract.js";
import { envExample, readme, deployment, dockerCompose, dockerfile, gitignore } from "./templates.js";

/**
 * Export builder (§42) — the single most important non-negotiable of the platform.
 *
 * Because internal packages are plain TypeScript sources and the apps are ordinary
 * Next.js apps, an export is a *pruned copy of the real monorepo* plus generated data.
 * Nothing is re-implemented for export, so the exported code cannot drift from the code
 * that was previewed.
 */

const COPY_DENYLIST = new Set(["node_modules", ".next", ".turbo", "dist", "coverage", ".git"]);
/** Apps to keep in an export (the generator and its exclusive deps are excluded). */
const ENTRY_APPS = ["@optic/storefront", "@optic/admin"];

export interface ExportOptions {
  websiteId: string;
  monorepoRoot: string;
  outDir: string;
  /** Also produce a .zip archive. */
  zip?: boolean;
}

export interface ExportResult {
  outDir: string;
  zipPath?: string;
  packages: string[];
  fileCount: number;
  sizeBytes: number;
  manifest: ExportManifest;
}

export interface ExportManifest {
  websiteSlug: string;
  websiteName: string;
  generatedAt: string;
  packages: string[];
  apps: string[];
  productCount: number;
  mediaCount: number;
}

async function copyDir(src: string, dest: string): Promise<void> {
  await cp(src, dest, {
    recursive: true,
    filter: (source) => {
      const base = source.split("/").pop() ?? "";
      return !COPY_DENYLIST.has(base);
    },
  });
}

/** Narrow a manifest to only the workspace deps that are in the closure. */
function pruneManifest(manifestText: string, closure: Set<string>): string {
  const manifest = JSON.parse(manifestText) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; [k: string]: unknown };
  const prune = (deps?: Record<string, string>) => {
    if (!deps) return deps;
    const out: Record<string, string> = {};
    for (const [name, version] of Object.entries(deps)) {
      if (version.startsWith("workspace:") && !closure.has(name)) continue; // drop excluded workspace deps
      out[name] = version;
    }
    return out;
  };
  if (manifest.dependencies) manifest.dependencies = prune(manifest.dependencies);
  if (manifest.devDependencies) manifest.devDependencies = prune(manifest.devDependencies);
  return JSON.stringify(manifest, null, 2) + "\n";
}

export async function buildExport(options: ExportOptions): Promise<ExportResult> {
  const { websiteId, monorepoRoot, outDir } = options;

  // 1. Resolve the closure from the entry apps.
  const workspace = await discoverWorkspace(monorepoRoot);
  const closure = computeClosure(workspace, ENTRY_APPS.filter((n) => workspace.has(n)));
  const missing = verifyClosure(workspace, closure.packages);
  if (missing.length > 0) {
    throw new Error(`Export closure incomplete: ${missing.map((m) => `${m.name} (needed by ${m.requiredBy})`).join(", ")}`);
  }

  // 2. Extract the website's data (validated).
  const data = await extractWebsite(websiteId);

  // 3. Fresh output directory.
  if (existsSync(outDir)) await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // 4. Copy the closure's source directories.
  for (const pkg of closure.resolved) {
    await copyDir(join(monorepoRoot, pkg.dir), join(outDir, pkg.dir));
    // Prune each package.json to drop excluded workspace deps (there are none inside the
    // closure by construction, but this also strips any stray dev-only cross-app deps).
    const pkgJsonPath = join(outDir, pkg.dir, "package.json");
    if (existsSync(pkgJsonPath)) {
      await writeFile(pkgJsonPath, pruneManifest(await readFile(pkgJsonPath, "utf8"), closure.packages));
    }
  }

  // 5. Rewrite root manifests narrowed to the copied set.
  await writeRootManifests(monorepoRoot, outDir, closure.resolved, data);

  // 6. Materialise the data files.
  await mkdir(join(outDir, "site"), { recursive: true });
  await writeFile(join(outDir, "site", "site.config.json"), JSON.stringify(data.config, null, 2));
  await writeFile(join(outDir, "site", "seed.json"), JSON.stringify(data.seed, null, 2));

  // 7. Copy referenced media into public/media of the storefront and admin.
  await copyMedia(monorepoRoot, outDir, data);

  // 8. Ops files.
  await writeFile(join(outDir, ".env.example"), envExample(data.config));
  await writeFile(join(outDir, "README.md"), readme(data.config));
  await writeFile(join(outDir, "DEPLOYMENT.md"), deployment(data.config));
  await writeFile(join(outDir, "docker-compose.yml"), dockerCompose(data.config));
  await writeFile(join(outDir, "Dockerfile"), dockerfile());
  await writeFile(join(outDir, ".gitignore"), gitignore());
  // Copy the export-time seed loader so `pnpm db:seed` works in the exported project.
  await writeExportSeed(outDir);

  const manifest: ExportManifest = {
    websiteSlug: data.config.identity.slug,
    websiteName: data.config.identity.name,
    generatedAt: new Date().toISOString(),
    packages: [...closure.packages].sort(),
    apps: ENTRY_APPS,
    productCount: data.seed.products.length,
    mediaCount: data.media.length,
  };
  await writeFile(join(outDir, "site", "manifest.json"), JSON.stringify(manifest, null, 2));

  const { fileCount, sizeBytes } = await measure(outDir);

  let zipPath: string | undefined;
  if (options.zip) {
    zipPath = `${outDir}.zip`;
    await zipDir(outDir, zipPath);
  }

  return { outDir, zipPath, packages: [...closure.packages], fileCount, sizeBytes, manifest };
}

async function writeRootManifests(monorepoRoot: string, outDir: string, resolved: WorkspacePackage[], data: ExportData): Promise<void> {
  const rootPkg = JSON.parse(await readFile(join(monorepoRoot, "package.json"), "utf8")) as Record<string, unknown>;
  // Narrow scripts to the exported apps.
  rootPkg.name = `${data.config.identity.slug}-site`;
  rootPkg.scripts = {
    dev: "turbo run dev",
    build: "turbo run build",
    lint: "turbo run lint",
    typecheck: "turbo run typecheck",
    test: "turbo run test",
    "db:generate": "pnpm --filter @optic/database generate",
    "db:migrate:deploy": "pnpm --filter @optic/database migrate:deploy",
    "db:seed": "pnpm --filter @optic/database exec tsx prisma/seed.export.ts",
    "start:storefront": "pnpm --filter @optic/storefront start",
    "start:admin": "pnpm --filter @optic/admin start",
    "create:admin": "pnpm --filter @optic/database exec tsx prisma/create-admin.ts",
  };
  await writeFile(join(outDir, "package.json"), JSON.stringify(rootPkg, null, 2) + "\n");

  // pnpm-workspace narrowed to the copied parents.
  const parents = new Set(resolved.map((p) => p.dir.split("/")[0]!));
  const workspaceYaml = `packages:\n${[...parents].map((p) => `  - "${p}/*"`).join("\n")}\n`;
  await writeFile(join(outDir, "pnpm-workspace.yaml"), workspaceYaml);

  // Copy turbo.json, tsconfig.base.json, .npmrc, prettier config verbatim if present.
  for (const file of ["turbo.json", "tsconfig.base.json", ".npmrc"]) {
    if (existsSync(join(monorepoRoot, file))) await cp(join(monorepoRoot, file), join(outDir, file));
  }
}

async function copyMedia(monorepoRoot: string, outDir: string, data: ExportData): Promise<void> {
  const storageDir = process.env.STORAGE_LOCAL_DIR
    ? (process.env.STORAGE_LOCAL_DIR.startsWith("/") ? process.env.STORAGE_LOCAL_DIR : join(monorepoRoot, process.env.STORAGE_LOCAL_DIR))
    : join(monorepoRoot, "var", "storage");

  const targets = [join(outDir, "apps", "storefront", "public", "media"), join(outDir, "apps", "admin", "public", "media")];
  for (const m of data.media) {
    const srcFile = join(storageDir, m.key);
    if (!existsSync(srcFile)) continue;
    for (const target of targets) {
      const dest = join(target, m.key);
      await mkdir(dirname(dest), { recursive: true });
      await cp(srcFile, dest).catch(() => undefined);
    }
  }
}

async function writeExportSeed(outDir: string): Promise<void> {
  // The exported seed reads site/seed.json + site/site.config.json and loads them via
  // the shared loader we ship in @optic/database.
  const seedScript = `/**
 * Exported seed. Loads site/site.config.json + site/seed.json into the database.
 * Idempotent. Run with: pnpm db:seed
 */
import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
for (const c of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(c)) { loadEnv({ path: c }); break; }
}
import { loadSiteFromConfig } from "../src/seed-loader.js";

const root = resolve(process.cwd(), "../..");
const config = JSON.parse(readFileSync(resolve(root, "site/site.config.json"), "utf8"));
const seed = JSON.parse(readFileSync(resolve(root, "site/seed.json"), "utf8"));

loadSiteFromConfig(config, seed)
  .then(() => { console.info("Seed complete."); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
`;
  await writeFile(join(outDir, "packages", "database", "prisma", "seed.export.ts"), seedScript);

  const createAdmin = `/**
 * Create the first admin user for the exported site.
 * Usage: pnpm create:admin -- <email> <password> "<name>"
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
for (const c of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(c)) { loadEnv({ path: c }); break; }
}
import { prisma } from "../src/client.js";
import { hashPassword, SYSTEM_ROLES } from "@optic/auth";

const [email, password, name] = process.argv.slice(2);
if (!email || !password) { console.error('Usage: pnpm create:admin -- <email> <password> "<name>"'); process.exit(1); }

const website = await prisma.website.findFirst();
if (!website) { console.error("Run db:seed first."); process.exit(1); }
const owner = SYSTEM_ROLES.find((r) => r.key === "site_owner")!;
const role = await prisma.role.upsert({ where: { websiteId_key: { websiteId: website.id, key: owner.key } }, update: {}, create: { websiteId: website.id, key: owner.key, name: owner.name, description: owner.description, isSystem: true, permissions: owner.permissions } });
const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email, name: name ?? "Admin", passwordHash: await hashPassword(password), isActive: true } });
await prisma.membership.upsert({ where: { userId_websiteId: { userId: user.id, websiteId: website.id } }, update: { roleId: role.id }, create: { userId: user.id, websiteId: website.id, roleId: role.id } });
console.info("Admin created:", email);
await prisma.$disconnect();
`;
  await writeFile(join(outDir, "packages", "database", "prisma", "create-admin.ts"), createAdmin);
}

async function measure(dir: string): Promise<{ fileCount: number; sizeBytes: number }> {
  const { readdir, stat } = await import("node:fs/promises");
  let fileCount = 0;
  let sizeBytes = 0;
  const walk = async (d: string) => {
    for (const entry of await readdir(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) await walk(full);
      else { fileCount++; sizeBytes += (await stat(full)).size; }
    }
  };
  await walk(dir);
  return { fileCount, sizeBytes };
}

async function zipDir(dir: string, zipPath: string): Promise<void> {
  const archiver = (await import("archiver")).default;
  await new Promise<void>((resolvePromise, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolvePromise());
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(dir, false);
    void archive.finalize();
  });
}
