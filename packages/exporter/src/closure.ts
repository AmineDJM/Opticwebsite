import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Dependency-closure resolution for export (§42). Given the monorepo root and the app
 * entry points to keep (storefront + admin), walk `dependencies` through `workspace:*`
 * links to compute the exact set of internal packages the exported project needs.
 *
 * The generator app and its exclusive deps are excluded *by construction*: we simply
 * never add them to the frontier. This is the property that makes an exported site
 * independent of this platform (§1).
 */

export interface PackageManifest {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface WorkspacePackage {
  name: string;
  dir: string; // relative to monorepo root, e.g. "packages/core"
  manifest: PackageManifest;
}

/** Discover all workspace packages under apps/, packages/, tooling/. */
export async function discoverWorkspace(root: string): Promise<Map<string, WorkspacePackage>> {
  const map = new Map<string, WorkspacePackage>();
  const { readdir } = await import("node:fs/promises");
  for (const parent of ["apps", "packages", "tooling"]) {
    const parentDir = join(root, parent);
    if (!existsSync(parentDir)) continue;
    const entries = await readdir(parentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgJson = join(parentDir, entry.name, "package.json");
      if (!existsSync(pkgJson)) continue;
      const manifest = JSON.parse(await readFile(pkgJson, "utf8")) as PackageManifest;
      map.set(manifest.name, { name: manifest.name, dir: `${parent}/${entry.name}`, manifest });
    }
  }
  return map;
}

const WORKSPACE_PROTO = "workspace:";

/** Collect the internal (`@optic/*`) dependencies of a manifest. */
function internalDeps(manifest: PackageManifest, includeDev: boolean): string[] {
  const out: string[] = [];
  const scan = (deps?: Record<string, string>) => {
    for (const [name, version] of Object.entries(deps ?? {})) {
      if (version.startsWith(WORKSPACE_PROTO)) out.push(name);
    }
  };
  scan(manifest.dependencies);
  if (includeDev) scan(manifest.devDependencies);
  return out;
}

export interface ClosureResult {
  /** Package names in the closure, including the entry apps. */
  packages: Set<string>;
  /** Directories (relative to root) to copy. */
  dirs: string[];
  /** Ordered list of WorkspacePackage in the closure. */
  resolved: WorkspacePackage[];
}

/**
 * Compute the closure starting from the given entry package names. Runtime deps are
 * always followed; dev deps are followed for tooling (eslint/tsconfig/tailwind configs)
 * so the exported project can lint/build, but NOT into other apps.
 */
export function computeClosure(workspace: Map<string, WorkspacePackage>, entryNames: string[]): ClosureResult {
  const packages = new Set<string>();
  const frontier = [...entryNames];

  while (frontier.length > 0) {
    const name = frontier.pop()!;
    if (packages.has(name)) continue;
    const pkg = workspace.get(name);
    if (!pkg) continue; // external dependency — resolved from the registry, not copied
    packages.add(name);

    // Follow runtime deps always; follow dev deps only for tooling/config packages and
    // for the entry apps (which need their build tooling).
    const isApp = pkg.dir.startsWith("apps/");
    const isTooling = pkg.dir.startsWith("tooling/");
    const includeDev = isApp || isTooling;
    for (const dep of internalDeps(pkg.manifest, includeDev)) {
      if (!packages.has(dep)) frontier.push(dep);
    }
  }

  const resolved = [...packages].map((n) => workspace.get(n)!).filter(Boolean);
  return { packages, dirs: resolved.map((p) => p.dir), resolved };
}

/**
 * Verify the closure is complete: every `workspace:*` dependency of every copied
 * package must itself be in the closure. Returns the list of missing (name → required-by)
 * — an empty list means the export is self-contained. This is the invariant the
 * exporter test asserts.
 */
export function verifyClosure(workspace: Map<string, WorkspacePackage>, closure: Set<string>): { name: string; requiredBy: string }[] {
  const missing: { name: string; requiredBy: string }[] = [];
  for (const name of closure) {
    const pkg = workspace.get(name);
    if (!pkg) continue;
    const isApp = pkg.dir.startsWith("apps/");
    const isTooling = pkg.dir.startsWith("tooling/");
    for (const dep of internalDeps(pkg.manifest, isApp || isTooling)) {
      if (!closure.has(dep)) missing.push({ name: dep, requiredBy: name });
    }
  }
  return missing;
}
