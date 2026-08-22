import { z } from "zod";

/**
 * Reusable zod schemas for values that appear at many boundaries. Centralising them
 * keeps validation identical between the storefront, admin, generator and export.
 */

/** Algerian mobile/landline: optional +213 or 0 prefix, 9 national digits. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+213|0)(?:5|6|7|2|3)\d{7,8}$/, "Numéro de téléphone invalide");

export const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide");

export const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres, tirets)");

/** A non-negative integer number of minor currency units. */
export const centsSchema = z.number().int("Montant invalide").min(0, "Montant négatif");

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Couleur hexadécimale invalide");

export const localeSchema = z.enum(["fr", "ar", "en"]);
export type Locale = z.infer<typeof localeSchema>;

export const quantitySchema = z.number().int().min(1).max(99);

/** Coerce a possibly-string query param into a bounded positive integer. */
export function toPositiveInt(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

/** Format zod errors into a flat field→message map for form responses. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
