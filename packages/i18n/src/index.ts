import { DICTIONARIES, type Dict } from "./dictionaries.js";
import { DEFAULT_LOCALE, LOCALE_BCP47, type Locale } from "./config.js";

export * from "./config.js";
export * from "./dictionaries.js";

/** Return the dictionary for a locale, falling back to the default. */
export function getDictionary(locale: Locale): Dict {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** A translator bound to a locale: `t("cart.total")`. Missing keys return the key. */
export type Translator = (path: string) => string;

export function createTranslator(locale: Locale): Translator {
  const dict = getDictionary(locale);
  return (path: string) => {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
      return undefined;
    }, dict);
    return typeof value === "string" ? value : path;
  };
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(LOCALE_BCP47[locale], options).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(value: Date | string | number, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const date = value instanceof Date ? value : new Date(value);
  try {
    return new Intl.DateTimeFormat(LOCALE_BCP47[locale], options ?? { dateStyle: "medium" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
