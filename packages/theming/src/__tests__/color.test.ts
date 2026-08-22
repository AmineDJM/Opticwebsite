import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  wcagLevel,
  ensureContrast,
  readableForeground,
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
} from "../color";

describe("color conversions", () => {
  it("round-trips hex/rgb", () => {
    expect(rgbToHex(hexToRgb("#1f6feb"))).toBe("#1f6feb");
  });
  it("round-trips hex/hsl approximately", () => {
    const back = hslToHex(hexToHsl("#c8a951"));
    expect(back).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("expands shorthand hex", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe("wcag contrast", () => {
  it("black on white is 21", () => {
    expect(Math.round(contrastRatio("#000000", "#ffffff"))).toBe(21);
  });
  it("classifies levels", () => {
    expect(wcagLevel(21)).toBe("AAA");
    expect(wcagLevel(5)).toBe("AA");
    expect(wcagLevel(3.2)).toBe("AA-large");
    expect(wcagLevel(2)).toBe("fail");
  });
  it("picks a readable foreground", () => {
    expect(readableForeground("#0d0f12")).toBe("#ffffff");
    expect(readableForeground("#faf7f2")).toBe("#111111");
  });
});

describe("ensureContrast", () => {
  it("raises a failing pair to at least AA", () => {
    const fixed = ensureContrast("#999999", "#ffffff", 4.5);
    expect(contrastRatio(fixed, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
  it("leaves a passing pair unchanged", () => {
    expect(ensureContrast("#000000", "#ffffff", 4.5)).toBe("#000000");
  });
});
