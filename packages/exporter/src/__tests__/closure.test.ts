import { describe, it, expect } from "vitest";
import { computeClosure, verifyClosure, type WorkspacePackage } from "../closure";

function ws(pkgs: { name: string; dir: string; deps?: string[]; devDeps?: string[] }[]): Map<string, WorkspacePackage> {
  const m = new Map<string, WorkspacePackage>();
  for (const p of pkgs) {
    m.set(p.name, {
      name: p.name, dir: p.dir,
      manifest: {
        name: p.name,
        dependencies: Object.fromEntries((p.deps ?? []).map((d) => [d, "workspace:*"])),
        devDependencies: Object.fromEntries((p.devDeps ?? []).map((d) => [d, "workspace:*"])),
      },
    });
  }
  return m;
}

describe("export closure", () => {
  const workspace = ws([
    { name: "@optic/storefront", dir: "apps/storefront", deps: ["@optic/ui", "@optic/database"], devDeps: ["@optic/tsconfig"] },
    { name: "@optic/admin", dir: "apps/admin", deps: ["@optic/ui", "@optic/database"] },
    { name: "@optic/generator", dir: "apps/generator", deps: ["@optic/ui", "@optic/database", "@optic/exporter"] },
    { name: "@optic/exporter", dir: "packages/exporter", deps: ["@optic/database"] },
    { name: "@optic/ui", dir: "packages/ui", deps: ["@optic/core"] },
    { name: "@optic/database", dir: "packages/database", deps: ["@optic/core"] },
    { name: "@optic/core", dir: "packages/core" },
    { name: "@optic/tsconfig", dir: "tooling/tsconfig" },
  ]);

  it("includes the entry apps and their transitive deps", () => {
    const closure = computeClosure(workspace, ["@optic/storefront", "@optic/admin"]);
    expect(closure.packages.has("@optic/storefront")).toBe(true);
    expect(closure.packages.has("@optic/admin")).toBe(true);
    expect(closure.packages.has("@optic/ui")).toBe(true);
    expect(closure.packages.has("@optic/database")).toBe(true);
    expect(closure.packages.has("@optic/core")).toBe(true);
    expect(closure.packages.has("@optic/tsconfig")).toBe(true); // app dev dep followed
  });

  it("EXCLUDES the generator and its exclusive deps", () => {
    const closure = computeClosure(workspace, ["@optic/storefront", "@optic/admin"]);
    expect(closure.packages.has("@optic/generator")).toBe(false);
    // exporter is only reachable from the generator → must be excluded
    expect(closure.packages.has("@optic/exporter")).toBe(false);
  });

  it("produces a self-contained closure (verifyClosure finds nothing missing)", () => {
    const closure = computeClosure(workspace, ["@optic/storefront", "@optic/admin"]);
    expect(verifyClosure(workspace, closure.packages)).toEqual([]);
  });

  it("detects an incomplete closure", () => {
    // A workspace where storefront needs a package not present → missing.
    const broken = ws([{ name: "@optic/storefront", dir: "apps/storefront", deps: ["@optic/missing"] }]);
    broken.set("@optic/missing", { name: "@optic/missing", dir: "packages/missing", manifest: { name: "@optic/missing", dependencies: { "@optic/gone": "workspace:*" } } });
    const closure = computeClosure(broken, ["@optic/storefront"]);
    const missing = verifyClosure(broken, closure.packages);
    expect(missing.some((m) => m.name === "@optic/gone")).toBe(true);
  });
});
