"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User, Heart, X } from "lucide-react";
import { cn } from "@optic/ui";
import { SearchBox } from "./search-box.js";

/**
 * Storefront header (§46). Sticky, mobile-first. Desktop shows full nav + search;
 * mobile collapses nav into a sheet and keeps search/cart reachable. The logo is
 * always the first, most prominent element (§44).
 */
export interface HeaderNavItem {
  label: string;
  url: string;
  isNew?: boolean;
}

export function SiteHeader({
  brandName,
  logoUrl,
  nav,
  cartCount,
  labels,
  features,
}: {
  brandName: string;
  logoUrl: string | null;
  nav: HeaderNavItem[];
  cartCount: number;
  labels: { search: string; account: string; cart: string; favorites: string; menu: string; searchPlaceholder: string };
  features: { search: boolean; favorites: boolean; accounts: boolean };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-container items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded lg:hidden"
          aria-label={labels.menu}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link href="/" className="flex shrink-0 items-center" aria-label={brandName}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
          ) : (
            <span className="font-heading text-xl font-semibold text-primary">{brandName}</span>
          )}
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-6 lg:flex" aria-label="Navigation principale">
          {nav.map((item) => (
            <Link
              key={item.url}
              href={item.url}
              className="relative text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              {item.label}
              {item.isNew && <span className="absolute -right-3 -top-1 h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {features.search && (
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-muted"
              aria-label={labels.search}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={20} />
            </button>
          )}
          {features.favorites && (
            <Link href="/compte/favoris" className="hidden h-10 w-10 items-center justify-center rounded hover:bg-muted sm:inline-flex" aria-label={labels.favorites}>
              <Heart size={20} />
            </Link>
          )}
          {features.accounts && (
            <Link href="/compte" className="inline-flex h-10 w-10 items-center justify-center rounded hover:bg-muted" aria-label={labels.account}>
              <User size={20} />
            </Link>
          )}
          <Link href="/panier" className="relative inline-flex h-10 w-10 items-center justify-center rounded hover:bg-muted" aria-label={`${labels.cart} (${cartCount})`}>
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile nav sheet */}
      <div className={cn("border-t border-border lg:hidden", menuOpen ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-container flex-col px-4 py-2" aria-label="Navigation mobile">
          {nav.map((item) => (
            <Link
              key={item.url}
              href={item.url}
              className="flex items-center justify-between py-3 text-base font-medium text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
              {item.isNew && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">Nouveau</span>}
            </Link>
          ))}
        </nav>
      </div>

      {searchOpen && (
        <SearchBox placeholder={labels.searchPlaceholder} onClose={() => setSearchOpen(false)} />
      )}
    </header>
  );
}
