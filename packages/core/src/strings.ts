/** URL/identifier helpers shared across the engine. */

// Combining diacritical marks (U+0300–U+036F), stripped after NFKD normalization.
const DIACRITICS = /[\u0300-\u036f]/g;
// ASCII control characters (U+0000–U+001F) plus DEL (U+007F).
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/**
 * Produce a URL-safe slug. Handles Latin diacritics; Arabic text (which does not
 * transliterate cleanly) falls back to a stable hash suffix so slugs stay unique
 * and valid rather than empty.
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (base.length > 0) return base.slice(0, 80);

  // Non-Latin input: derive a deterministic short token so the slug is never empty.
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `item-${hash.toString(36)}`;
}

/** Slugify then guarantee uniqueness against a set of taken slugs. */
export function uniqueSlug(input: string, taken: ReadonlySet<string>): string {
  const base = slugify(input);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

/** Collapse whitespace and strip control characters from user input. */
export function normalizeWhitespace(text: string): string {
  return text.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
