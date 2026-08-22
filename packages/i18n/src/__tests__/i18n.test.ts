import { describe, it, expect } from "vitest";
import { createTranslator, negotiateLocale, isRtl, direction, getDictionary, DICTIONARIES } from "../index";

describe("i18n", () => {
  it("translates by dotted path", () => {
    const t = createTranslator("fr");
    expect(t("cart.total")).toBe("Total");
    expect(t("checkout.cashOnDelivery")).toBe("Paiement à la livraison");
  });
  it("returns the key for missing paths", () => {
    const t = createTranslator("fr");
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
  it("marks arabic as rtl", () => {
    expect(isRtl("ar")).toBe(true);
    expect(direction("ar")).toBe("rtl");
    expect(isRtl("fr")).toBe(false);
  });
  it("negotiates locale from accept-language", () => {
    expect(negotiateLocale("ar,fr;q=0.8", ["fr", "ar"])).toBe("ar");
    expect(negotiateLocale("de", ["fr", "en"])).toBe("fr");
    expect(negotiateLocale("en-US,en;q=0.9", ["fr", "en"])).toBe("en");
  });
  it("has matching key sets across locales", () => {
    const flatKeys = (obj: object, prefix = ""): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === "object" && v ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      );
    const fr = flatKeys(DICTIONARIES.fr).sort();
    const ar = flatKeys(DICTIONARIES.ar).sort();
    const en = flatKeys(DICTIONARIES.en).sort();
    expect(ar).toEqual(fr);
    expect(en).toEqual(fr);
  });
});
