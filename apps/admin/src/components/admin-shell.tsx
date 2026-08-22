"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, FolderTree, Tag, Truck,
  FileText, Image as ImageIcon, HelpCircle, Settings, ShieldCheck, ScrollText,
  Menu, X, LogOut, Store,
} from "lucide-react";
import { cn } from "@optic/ui";
import { logoutAction } from "../server/actions/auth.js";

/**
 * Admin shell: responsive sidebar nav + top bar. Nav items are filtered by the
 * viewer's permissions so operators only see sections they can use (§35).
 */
export interface NavPermission { href: string; label: string; icon: string; permission: string | null }

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  dashboard: LayoutDashboard, products: Package, orders: ShoppingCart, customers: Users,
  categories: FolderTree, coupons: Tag, shipping: Truck, content: FileText, media: ImageIcon,
  quiz: HelpCircle, settings: Settings, users: ShieldCheck, audit: ScrollText, brands: Store,
};

export function AdminShell({
  nav,
  websiteName,
  userName,
  roleKey,
  storefrontUrl,
  children,
}: {
  nav: NavPermission[];
  websiteName: string;
  userName: string;
  roleKey: string;
  storefrontUrl: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navList = (
    <nav className="flex flex-col gap-0.5 p-3">
      {nav.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            <Icon size={18} /> {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border p-4">
          <p className="font-heading text-lg font-semibold text-primary">{websiteName}</p>
          <p className="text-xs text-muted-foreground">Administration</p>
        </div>
        <div className="flex-1 overflow-y-auto">{navList}</div>
        <div className="border-t border-border p-3">
          <a href={storefrontUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <Store size={16} /> Voir la boutique
          </a>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} role="presentation">
          <aside className="h-full w-64 bg-surface" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <p className="font-heading font-semibold text-primary">{websiteName}</p>
              <button onClick={() => setOpen(false)} aria-label="Fermer"><X size={20} /></button>
            </div>
            {navList}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={22} /></button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{userName}</p>
              <p className="text-xs capitalize text-muted-foreground">{roleKey.replace(/_/g, " ")}</p>
            </div>
            <form action={logoutAction}>
              <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-muted" aria-label="Se déconnecter"><LogOut size={18} /></button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
