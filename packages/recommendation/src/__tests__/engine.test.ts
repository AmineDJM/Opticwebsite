import { describe, it, expect } from "vitest";
import { recommend, scoreProduct, preferredFrameShapes, preferredColors } from "../engine";
import { profileFromManual, type RecommendationProfile } from "../profile";
import type { RecommendableProduct } from "../engine";

const round: RecommendationProfile = profileFromManual({ faceShape: "round", undertone: "warm", styleProfile: "modern" });

const products: RecommendableProduct[] = [
  { id: "1", slug: "rect", name: "Rectangle", frameShape: "rectangle", recommendedColors: ["brown"], styleProfiles: ["modern"] },
  { id: "2", slug: "round", name: "Round", frameShape: "round" }, // discouraged for round faces
  { id: "3", slug: "square", name: "Square", frameShape: "square", recommendedUndertones: ["warm"] },
  { id: "4", slug: "tagged", name: "Curated", frameShape: "wayfarer", recommendedFaceShapes: ["round"] },
];

describe("recommendation engine", () => {
  it("ranks flattering frames above discouraged ones", () => {
    const results = recommend(round, products);
    const slugs = results.map((r) => r.product.slug);
    expect(slugs).toContain("rect");
    // round frame is discouraged for a round face and should be filtered out
    expect(slugs).not.toContain("round");
  });

  it("gives explicit curated tags strong weight", () => {
    const results = recommend(round, products);
    // 'tagged' has recommendedFaceShapes=['round'] (+5) and wayfarer for round (+3)
    expect(results[0]!.product.slug).toBe("tagged");
    expect(results[0]!.matchPercent).toBeGreaterThanOrEqual(95);
  });

  it("produces human reasons", () => {
    const scored = scoreProduct(round, products[0]!);
    expect(scored.reasons.length).toBeGreaterThan(0);
  });

  it("penalises avoid tags", () => {
    const avoid: RecommendableProduct = { id: "x", slug: "avoid", name: "Avoid", frameShape: "round", avoidFaceShapes: ["round"] };
    expect(scoreProduct(round, avoid).score).toBeLessThan(0);
  });

  it("is deterministic", () => {
    const a = recommend(round, products).map((r) => r.product.slug);
    const b = recommend(round, products).map((r) => r.product.slug);
    expect(a).toEqual(b);
  });

  it("derives preferred frame shapes and colors for filters", () => {
    expect(preferredFrameShapes(round)).toContain("rectangle");
    expect(preferredColors(round)).toContain("brown");
  });

  it("does not depend on a camera (manual profile works fully)", () => {
    const manual = profileFromManual({ faceShape: "square" });
    const results = recommend(manual, products);
    expect(results.length).toBeGreaterThan(0);
    // square face favours round frames
    expect(results.map((r) => r.product.slug)).toContain("round");
  });
});
