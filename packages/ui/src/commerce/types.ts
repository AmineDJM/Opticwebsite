/**
 * View models for commerce components. The UI package never imports the database;
 * apps map their query results to these plain shapes. This keeps @optic/ui
 * presentational and testable, and decouples it from the Prisma schema.
 */

export interface ProductCardModel {
  id: string;
  slug: string;
  name: string;
  brandName?: string | null;
  priceCents: number;
  comparePriceCents?: number | null;
  imageUrl?: string | null;
  secondaryImageUrl?: string | null;
  isNew?: boolean;
  isBestseller?: boolean;
  inStock?: boolean;
  /** For recommendation contexts: 0..100 match and a short reason. */
  matchPercent?: number;
  matchReason?: string;
  colors?: { name: string; hex: string }[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
