"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { CatalogFilters } from "./catalog-filters.js";

/** Sort control + result count + mobile filter drawer trigger. */
const SORTS = [
  { value: "relevance", label: "Pertinence" },
  { value: "newest", label: "Nouveautés" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "bestselling", label: "Meilleures ventes" },
  { value: "name_asc", label: "Nom A→Z" },
];

interface Facets {
  categories: { slug: string; name: string; parentId: string | null }[];
  brands: { slug: string; name: string }[];
}

export function CatalogToolbar({ total, sort, facets, activeCount }: { total: number; sort: string; facets: Facets; activeCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawer, setDrawer] = useState(false);

  function changeSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "relevance") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{total} produit{total > 1 ? "s" : ""}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm lg:hidden"
        >
          <SlidersHorizontal size={16} /> Filtres {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeCount}</span>}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only sm:not-sr-only text-muted-foreground">Trier</span>
          <select
            value={sort}
            onChange={(e) => changeSort(e.target.value)}
            className="rounded border border-border bg-background px-2 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer les filtres" className="absolute inset-0 cursor-default bg-foreground/40" onClick={() => setDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-heading text-lg font-semibold">Filtres</span>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Fermer"><X size={20} /></button>
            </div>
            <CatalogFilters facets={facets} activeCount={activeCount} />
          </div>
        </div>
      )}
    </div>
  );
}
