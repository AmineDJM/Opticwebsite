import { requireAdmin } from "../../server/session.js";
import { can, type Permission } from "@optic/auth";
import { AdminShell, type NavPermission } from "../../components/admin-shell.js";

/**
 * Dashboard layout: guards every child route (redirects to /login) and renders the
 * permission-filtered nav. Sections the operator lacks permission for are hidden.
 */
const NAV: NavPermission[] = [
  { href: "/", label: "Tableau de bord", icon: "dashboard", permission: null },
  { href: "/produits", label: "Produits", icon: "products", permission: "product:read" },
  { href: "/categories", label: "Catégories", icon: "categories", permission: "category:read" },
  { href: "/marques", label: "Marques", icon: "brands", permission: "brand:read" },
  { href: "/commandes", label: "Commandes", icon: "orders", permission: "order:read" },
  { href: "/clients", label: "Clients", icon: "customers", permission: "customer:read" },
  { href: "/livraison", label: "Livraison", icon: "shipping", permission: "shipping:read" },
  { href: "/promotions", label: "Promotions", icon: "coupons", permission: "coupon:read" },
  { href: "/contenu", label: "Contenu & pages", icon: "content", permission: "content:read" },
  { href: "/medias", label: "Médiathèque", icon: "media", permission: "media:read" },
  { href: "/quiz", label: "Quiz Verres", icon: "quiz", permission: "quiz:read" },
  { href: "/utilisateurs", label: "Utilisateurs", icon: "users", permission: "user:read" },
  { href: "/journal", label: "Journal d'audit", icon: "audit", permission: "audit:read" },
  { href: "/parametres", label: "Paramètres", icon: "settings", permission: "settings:read" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const nav = NAV.filter((item) => item.permission === null || can(ctx.permissions, item.permission as Permission));
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

  return (
    <AdminShell nav={nav} websiteName={ctx.websiteName} userName={ctx.user.name} roleKey={ctx.roleKey} storefrontUrl={storefrontUrl}>
      {children}
    </AdminShell>
  );
}
