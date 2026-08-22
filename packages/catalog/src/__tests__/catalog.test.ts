import { describe, it, expect } from "vitest";
import { parseFilters, filtersToQueryString, hasActiveFilters, countActiveFilters } from "../filters";
import { buildProductWhere, buildProductOrderBy, applyRecommendationBias } from "../query";

describe("filter parsing", () => {
  it("parses arrays, prices, sort and pagination", () => {
    const f = parseFilters({
      brand: "momus,rayban",
      shape: "round",
      min: "100000",
      max: "500000",
      stock: "1",
      sort: "price_asc",
      page: "2",
      q: "  aviateur ",
    });
    expect(f.brandSlugs).toEqual(["momus", "rayban"]);
    expect(f.frameShapes).toEqual(["round"]);
    expect(f.minPriceCents).toBe(100000);
    expect(f.inStockOnly).toBe(true);
    expect(f.sort).toBe("price_asc");
    expect(f.page.page).toBe(2);
    expect(f.search).toBe("aviateur");
  });

  it("defaults invalid sort to relevance", () => {
    expect(parseFilters({ sort: "nonsense" }).sort).toBe("relevance");
  });

  it("round-trips to a query string", () => {
    const f = parseFilters({ brand: "momus", shape: "round,square", sale: "1" });
    const qs = filtersToQueryString(f);
    const back = parseFilters(Object.fromEntries(new URLSearchParams(qs)));
    expect(back.brandSlugs).toEqual(["momus"]);
    expect(back.frameShapes).toEqual(["round", "square"]);
    expect(back.onSale).toBe(true);
  });

  it("detects and counts active filters", () => {
    const empty = parseFilters({});
    expect(hasActiveFilters(empty)).toBe(false);
    const active = parseFilters({ brand: "momus", color: "black,brown", min: "100" });
    expect(hasActiveFilters(active)).toBe(true);
    expect(countActiveFilters(active)).toBe(1 + 2 + 1);
  });
});

describe("prisma query building", () => {
  it("builds a where for category+brand+price+stock", () => {
    const f = parseFilters({ category: "montures", brand: "momus", min: "100000", stock: "1" });
    const where = buildProductWhere(f);
    expect(where.status).toBe("ACTIVE");
    expect(where.categories).toEqual({ some: { category: { slug: "montures" } } });
    expect(where.brand).toEqual({ slug: { in: ["momus"] } });
    expect(where.priceCents).toEqual({ gte: 100000 });
    expect(where.variants).toEqual({ some: { isActive: true, stock: { gt: 0 } } });
  });

  it("builds a full-text OR for search", () => {
    const where = buildProductWhere(parseFilters({ q: "momus" }));
    expect(where.OR).toBeDefined();
    expect(where.OR!.length).toBeGreaterThan(3);
  });

  it("maps sort keys to orderBy", () => {
    expect(buildProductOrderBy("price_desc")).toEqual([{ priceCents: "desc" }]);
    expect(buildProductOrderBy("newest")[0]).toEqual({ publishedAt: "desc" });
  });

  it("biases products toward preferred frame shapes", () => {
    const products = [
      { id: "a", frameShape: "square" },
      { id: "b", frameShape: "round" },
      { id: "c", frameShape: "aviator" },
    ];
    const biased = applyRecommendationBias(products, ["round", "aviator"]);
    expect(biased[0]?.id).toBe("b");
    expect(biased[1]?.id).toBe("c");
  });
});
