"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";

/**
 * Search overlay with autocomplete (§8). Debounced fetch to /api/search; results are
 * products/brands/categories. Enter runs a full catalogue search. Keyboard accessible
 * (Escape closes, focus trapped to the input).
 */
interface SearchResults {
  products: { slug: string; name: string; brandName: string | null }[];
  brands: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
}

export function SearchBox({ placeholder, onClose }: { placeholder: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/boutique?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40" onClick={onClose} role="presentation">
      <div
        className="mx-auto mt-0 max-w-container bg-background p-4 shadow-lg sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={submit} className="flex items-center gap-3">
          <Search size={20} className="text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-11 flex-1 bg-transparent text-base outline-none"
            aria-label={placeholder}
          />
          <button type="button" onClick={onClose} aria-label="Fermer" className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-muted">
            <X size={20} />
          </button>
        </form>

        {loading && <p className="px-8 py-4 text-sm text-muted-foreground">Recherche…</p>}

        {results && (
          <div className="mt-2 max-h-[60vh] overflow-y-auto">
            {results.products.length === 0 && results.brands.length === 0 && results.categories.length === 0 && (
              <p className="px-8 py-6 text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
            )}
            {results.categories.length > 0 && (
              <Group title="Catégories">
                {results.categories.map((c) => (
                  <ResultLink key={c.slug} href={`/categorie/${c.slug}`} label={c.name} onClose={onClose} />
                ))}
              </Group>
            )}
            {results.brands.length > 0 && (
              <Group title="Marques">
                {results.brands.map((b) => (
                  <ResultLink key={b.slug} href={`/marques/${b.slug}`} label={b.name} onClose={onClose} />
                ))}
              </Group>
            )}
            {results.products.length > 0 && (
              <Group title="Produits">
                {results.products.map((p) => (
                  <ResultLink key={p.slug} href={`/produit/${p.slug}`} label={p.name} sublabel={p.brandName ?? undefined} onClose={onClose} />
                ))}
              </Group>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="px-8 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function ResultLink({ href, label, sublabel, onClose }: { href: string; label: string; sublabel?: string; onClose: () => void }) {
  return (
    <Link href={href} onClick={onClose} className="flex items-center gap-2 px-8 py-2.5 text-sm hover:bg-muted">
      <span className="text-foreground">{label}</span>
      {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
    </Link>
  );
}
