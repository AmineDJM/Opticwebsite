import "server-only";
import { cache } from "react";
import { createTranslator, direction, type Locale, type Translator } from "@optic/i18n";
import { getLocale } from "./tenant.js";

export const getT = cache(async (): Promise<{ t: Translator; locale: Locale; dir: "ltr" | "rtl" }> => {
  const locale = await getLocale();
  return { t: createTranslator(locale), locale, dir: direction(locale) };
});
