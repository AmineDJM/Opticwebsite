import { describe, it, expect } from "vitest";
import { parseBlockProps, isBlockType, BLOCK_TYPES } from "../blocks";
import { getPreset, PRESET_THEMES } from "../presets";
import { themeToCssVariables } from "../theme";
import { resolveFeatures, DEFAULT_FEATURES } from "../features";
import { safeParseSiteConfig } from "../site";

describe("blocks", () => {
  it("applies defaults for a known block", () => {
    const props = parseBlockProps("hero", {});
    expect(props.heading).toBeTruthy();
    expect(props.align).toBe("left");
  });
  it("recognises all registered types", () => {
    for (const t of BLOCK_TYPES) expect(isBlockType(t)).toBe(true);
    expect(isBlockType("nope")).toBe(false);
  });
  it("keeps valid overrides", () => {
    const props = parseBlockProps("featuredProducts", { source: "bestsellers", limit: 6 });
    expect(props.source).toBe("bestsellers");
    expect(props.limit).toBe(6);
  });
});

describe("presets", () => {
  it("exposes 7 complete presets", () => {
    expect(Object.keys(PRESET_THEMES)).toHaveLength(7);
  });
  it("falls back to modern for unknown key", () => {
    expect(getPreset("does-not-exist").preset).toBe("modern");
  });
  it("emits css variables for every color", () => {
    const vars = themeToCssVariables(PRESET_THEMES.luxury);
    expect(vars["--color-primary"]).toMatch(/^#/);
    expect(vars["--radius"]).toMatch(/px$/);
  });
});

describe("features", () => {
  it("merges overrides over defaults", () => {
    const f = resolveFeatures({ reviews: true, unknownKey: true });
    expect(f.reviews).toBe(true);
    expect(f.visagism).toBe(DEFAULT_FEATURES.visagism);
    expect("unknownKey" in f).toBe(false);
  });
});

describe("site config", () => {
  it("validates a minimal config", () => {
    const res = safeParseSiteConfig({
      identity: { name: "Test", slug: "test" },
      theme: getPreset("modern"),
    });
    expect(res.success).toBe(true);
  });
  it("rejects a config without identity", () => {
    const res = safeParseSiteConfig({ theme: getPreset("modern") });
    expect(res.success).toBe(false);
  });
});
