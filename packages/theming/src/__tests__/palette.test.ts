import { describe, it, expect } from "vitest";
import { buildPaletteFromColors, auditPalette, extractDominantColors, themeFromPalette } from "../palette";
import { contrastRatio } from "../color";

describe("palette", () => {
  it("builds an AA-compliant ramp from a single brand color", () => {
    const ramp = buildPaletteFromColors(["#1f6feb"]);
    for (const audit of auditPalette(ramp)) {
      expect(audit.ratio).toBeGreaterThanOrEqual(3);
    }
    expect(contrastRatio(ramp.foreground, ramp.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(ramp.primaryForeground, ramp.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it("builds a dark palette", () => {
    const ramp = buildPaletteFromColors(["#c8a951"], "dark");
    expect(contrastRatio(ramp.foreground, ramp.background)).toBeGreaterThanOrEqual(4.5);
  });

  it("extracts dominant colors ignoring near-white", () => {
    const samples = [
      ...Array(100).fill({ r: 255, g: 255, b: 255 }),
      ...Array(30).fill({ r: 31, g: 111, b: 235 }),
    ];
    const colors = extractDominantColors(samples);
    expect(colors[0]).toBe("#1f6feb");
  });

  it("grafts palette onto a preset keeping typography", () => {
    const theme = themeFromPalette(["#d6336c"], "fashion");
    expect(theme.typography.headingFont).toContain("Grotesk");
    expect(theme.colors.primary).toBe("#d6336c");
  });
});
