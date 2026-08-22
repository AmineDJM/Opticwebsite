/** Locale registry and text direction. Arabic requires real RTL (§33). */

export const LOCALES = ["fr", "ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export type Direction = "ltr" | "rtl";

export const LOCALE_DIRECTION: Record<Locale, Direction> = {
  fr: "ltr",
  ar: "rtl",
  en: "ltr",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  ar: "العربية",
  en: "English",
};

/** BCP-47 tags for Intl formatters. */
export const LOCALE_BCP47: Record<Locale, string> = {
  fr: "fr-DZ",
  ar: "ar-DZ",
  en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function direction(locale: Locale): Direction {
  return LOCALE_DIRECTION[locale];
}

export function isRtl(locale: Locale): boolean {
  return LOCALE_DIRECTION[locale] === "rtl";
}

/** Negotiate a locale from an Accept-Language header against a site's enabled set. */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
  available: readonly Locale[],
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  const enabled = available.length > 0 ? available : LOCALES;
  if (!acceptLanguage) return enabled.includes(fallback) ? fallback : enabled[0]!;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: (tag ?? "").slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (isLocale(tag) && enabled.includes(tag)) return tag;
  }
  return enabled.includes(fallback) ? fallback : enabled[0]!;
}
