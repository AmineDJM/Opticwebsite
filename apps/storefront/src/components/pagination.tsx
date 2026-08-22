"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** URL-synced pagination. */
export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pageCount <= 1) return null;

  function go(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  }

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded border border-border disabled:opacity-40" aria-label="Précédent">
        <ChevronLeft size={18} />
      </button>
      {pages.map((p, i) => {
        const prev = pages[i - 1];
        return (
          <span key={p} className="flex items-center">
            {prev && p - prev > 1 && <span className="px-1 text-muted-foreground">…</span>}
            <button
              type="button"
              onClick={() => go(p)}
              aria-current={p === page ? "page" : undefined}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded border px-2 text-sm ${p === page ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
            >
              {p}
            </button>
          </span>
        );
      })}
      <button type="button" disabled={page >= pageCount} onClick={() => go(page + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded border border-border disabled:opacity-40" aria-label="Suivant">
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
