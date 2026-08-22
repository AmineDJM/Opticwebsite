/**
 * Role-based access control (§35). Permissions are fine-grained strings of the form
 * `resource:action`. Roles hold a list of permissions; a `*` wildcard grants all.
 * System role templates ship with the engine; a website may define custom roles.
 */

export const PERMISSIONS = [
  // catalogue
  "product:read",
  "product:write",
  "product:delete",
  "category:read",
  "category:write",
  "brand:read",
  "brand:write",
  "inventory:write",
  "price:write",
  // orders
  "order:read",
  "order:write",
  "order:status",
  "order:export",
  // customers
  "customer:read",
  "customer:write",
  // content
  "content:read",
  "content:write",
  "media:read",
  "media:write",
  // marketing
  "coupon:read",
  "coupon:write",
  "quiz:read",
  "quiz:write",
  // logistics
  "shipping:read",
  "shipping:write",
  // configuration
  "settings:read",
  "settings:write",
  "theme:write",
  "analytics:read",
  // access control
  "user:read",
  "user:write",
  "role:write",
  "audit:read",
  // platform (generator / super-admin)
  "website:create",
  "website:export",
  "website:delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const WILDCARD = "*";

export interface RoleTemplate {
  key: string;
  name: string;
  description: string;
  permissions: (Permission | typeof WILDCARD)[];
}

const READ_ONLY: Permission[] = PERMISSIONS.filter((p) => p.endsWith(":read")) as Permission[];

export const SYSTEM_ROLES: RoleTemplate[] = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Accès total à la plateforme et au générateur.",
    permissions: [WILDCARD],
  },
  {
    key: "site_owner",
    name: "Propriétaire du site",
    description: "Contrôle complet d'un site (hors plateforme).",
    permissions: PERMISSIONS.filter((p) => !p.startsWith("website:")) as Permission[],
  },
  {
    key: "administrator",
    name: "Administrateur",
    description: "Gestion courante du site.",
    permissions: PERMISSIONS.filter(
      (p) => !p.startsWith("website:") && p !== "role:write" && p !== "user:write",
    ) as Permission[],
  },
  {
    key: "catalogue_manager",
    name: "Responsable catalogue",
    description: "Produits, catégories, marques, stock, prix, médias.",
    permissions: [
      "product:read",
      "product:write",
      "product:delete",
      "category:read",
      "category:write",
      "brand:read",
      "brand:write",
      "inventory:write",
      "price:write",
      "media:read",
      "media:write",
    ],
  },
  {
    key: "order_manager",
    name: "Responsable commandes",
    description: "Traitement des commandes et clients.",
    permissions: ["order:read", "order:write", "order:status", "order:export", "customer:read", "shipping:read"],
  },
  {
    key: "content_manager",
    name: "Responsable contenu",
    description: "Pages, blocs, médias, SEO, quiz.",
    permissions: ["content:read", "content:write", "media:read", "media:write", "quiz:read", "quiz:write", "settings:read"],
  },
  {
    key: "customer_support",
    name: "Support client",
    description: "Lecture des commandes et clients, mise à jour de statut.",
    permissions: ["order:read", "order:status", "customer:read", "product:read"],
  },
  {
    key: "read_only",
    name: "Lecture seule",
    description: "Consultation uniquement.",
    permissions: READ_ONLY,
  },
];

/** Does a permission set satisfy the required permission? */
export function can(granted: readonly string[], required: Permission): boolean {
  return granted.includes(WILDCARD) || granted.includes(required);
}

export function canAll(granted: readonly string[], required: readonly Permission[]): boolean {
  return required.every((p) => can(granted, p));
}

export function canAny(granted: readonly string[], required: readonly Permission[]): boolean {
  return required.some((p) => can(granted, p));
}

export function isValidPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value) || value === WILDCARD;
}
