"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FRAME_SHAPES, FRAME_MATERIALS } from "@optic/core";

/**
 * Catalogue filters (§8). URL-synced so results are shareable, back/forward works, and
 * server components re-render from the query string. Each change patches one param and
 * resets pagination.
 */
interface Facets {
  categories: { slug: string; name: string; parentId: string | null }[];
  brands: { slug: string; name: string }[];
}

const GENDERS = [
  { value: "MEN", label: "Homme" },
  { value: "WOMEN", label: "Femme" },
  { value: "KIDS", label: "Enfant" },
  { value: "UNISEX", label: "Mixte" },
];

const SHAPE_LABELS: Record<string, string> = {
  round: "Ronde", square: "Carrée", rectangle: "Rectangle", oval: "Ovale", aviator: "Aviateur",
  cat_eye: "Œil de chat", wayfarer: "Wayfarer", browline: "Browline", geometric: "Géométrique",
  oversized: "Oversize", rimless: "Sans monture",
};
const MATERIAL_LABELS: Record<string, string> = {
  acetate: "Acétate", metal: "Métal", titanium: "Titane", stainless_steel: "Acier", tr90: "TR90", wood: "Bois", mixed: "Mixte",
};

export function CatalogFilters({ facets, activeCount }: { facets: Facets; activeCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = useCallback(
    (key: string) => (searchParams.get(key) ?? "").split(",").filter(Boolean),
    [searchParams],
  );

  const toggle = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const set = new Set(current(key));
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size) params.set(key, [...set].join(","));
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [current, pathname, router, searchParams],
  );

  const setSingle = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const reset = () => router.push(pathname, { scroll: false });

  const parents = facets.categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-6 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Filtres</h2>
        {activeCount > 0 && (
          <button type="button" onClick={reset} className="text-xs text-primary hover:underline">
            Réinitialiser ({activeCount})
          </button>
        )}
      </div>

      <FilterGroup title="Catégorie">
        {parents.map((c) => (
          <CheckRow key={c.slug} label={c.name} checked={current("category").includes(c.slug)} onChange={() => setSingle("category", current("category").includes(c.slug) ? null : c.slug)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Genre">
        {GENDERS.map((g) => (
          <CheckRow key={g.value} label={g.label} checked={current("gender").includes(g.value)} onChange={() => toggle("gender", g.value)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Marque">
        {facets.brands.map((b) => (
          <CheckRow key={b.slug} label={b.name} checked={current("brand").includes(b.slug)} onChange={() => toggle("brand", b.slug)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Forme">
        {FRAME_SHAPES.map((s) => (
          <CheckRow key={s} label={SHAPE_LABELS[s] ?? s} checked={current("shape").includes(s)} onChange={() => toggle("shape", s)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Matière">
        {FRAME_MATERIALS.map((m) => (
          <CheckRow key={m} label={MATERIAL_LABELS[m] ?? m} checked={current("material").includes(m)} onChange={() => toggle("material", m)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Disponibilité">
        <CheckRow label="En stock uniquement" checked={searchParams.get("stock") === "1"} onChange={() => setSingle("stock", searchParams.get("stock") === "1" ? null : "1")} />
        <CheckRow label="En promotion" checked={searchParams.get("sale") === "1"} onChange={() => setSingle("sale", searchParams.get("sale") === "1" ? null : "1")} />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-medium text-foreground">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-muted-foreground hover:text-foreground">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30" />
      {label}
    </label>
  );
}
