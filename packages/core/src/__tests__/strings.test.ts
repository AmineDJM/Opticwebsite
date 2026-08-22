import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug, truncate, initials, normalizeWhitespace } from "../strings";

describe("slugify", () => {
  it("handles accents and spaces", () => {
    expect(slugify("Montures Médicales Homme")).toBe("montures-medicales-homme");
  });
  it("collapses separators", () => {
    expect(slugify("  A + B / C  ")).toBe("a-b-c");
  });
  it("never returns empty for non-latin", () => {
    const s = slugify("نظارات شمسية");
    expect(s.length).toBeGreaterThan(0);
    expect(s).toMatch(/^[a-z0-9-]+$/);
  });
  it("is deterministic for non-latin", () => {
    expect(slugify("نظارات")).toBe(slugify("نظارات"));
  });
});

describe("uniqueSlug", () => {
  it("suffixes collisions", () => {
    const taken = new Set(["aura", "aura-2"]);
    expect(uniqueSlug("Aura", taken)).toBe("aura-3");
  });
});

describe("misc strings", () => {
  it("truncates with ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hell…");
    expect(truncate("hi", 5)).toBe("hi");
  });
  it("computes initials", () => {
    expect(initials("Aura Optique")).toBe("AO");
    expect(initials("Momus")).toBe("MO");
  });
  it("normalizes whitespace", () => {
    expect(normalizeWhitespace("a\t\n  b")).toBe("a b");
  });
});
