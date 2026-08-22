import type { ColorRamp, Theme } from "@optic/config";
import { getPreset } from "@optic/config";
import {
  contrastRatio,
  ensureContrast,
  hexToHsl,
  hslToHex,
  readableForeground,
  rgbToHex,
  rotateHue,
  withLightness,
  type RGB,
} from "./color.js";

/**
 * Palette extraction (§4). Given the dominant colours of a logo, build a complete,
 * accessible ColorRamp. The pixel sampling itself is done by the caller (browser
 * canvas in the generator, or `sharp` server-side) and handed to us as a list of
 * RGB samples — this keeps the maths pure and unit-testable.
 */

export interface ColorCount {
  color: RGB;
  count: number;
}

/** Quantise samples into buckets and return the most frequent, vivid-enough colours. */
export function extractDominantColors(samples: RGB[], max = 6): string[] {
  const buckets = new Map<string, ColorCount>();
  for (const c of samples) {
    // Skip near-white / near-black / near-transparent-ish greys — logos usually sit
    // on white and we don't want the background to dominate.
    const { l, s } = hexToHsl(rgbToHex(c));
    if (l > 0.95 || l < 0.05) continue;
    const key = `${Math.round(c.r / 24)}-${Math.round(c.g / 24)}-${Math.round(c.b / 24)}`;
    const existing = buckets.get(key);
    // Weight vivid colours slightly so a small coloured mark beats a large grey field.
    const weight = 1 + s;
    if (existing) existing.count += weight;
    else buckets.set(key, { color: c, count: weight });
  }
  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((b) => rgbToHex(b.color));
}

/**
 * Build a full ColorRamp from one or more brand colours. The first colour becomes
 * primary; a secondary is chosen (second dominant, or a hue rotation) and an accent
 * derived. Every foreground is contrast-corrected to at least AA.
 */
export function buildPaletteFromColors(colors: string[], mode: "light" | "dark" = "light"): ColorRamp {
  const primary = colors[0] ?? "#1f6feb";
  const secondary = colors[1] ?? withLightness(primary, hexToHsl(primary).l * 0.6);
  const accent = colors[2] ?? rotateHue(primary, 150);

  if (mode === "dark") {
    const background = "#0d0f12";
    const surface = "#16191d";
    return correctRamp({
      primary: withLightness(primary, Math.max(0.55, hexToHsl(primary).l)),
      primaryForeground: "#0b0b0c",
      secondary: withLightness(secondary, 0.8),
      secondaryForeground: "#0b0b0c",
      accent: withLightness(accent, 0.65),
      accentForeground: "#0b0b0c",
      background,
      foreground: "#f2efe9",
      surface,
      surfaceForeground: "#f2efe9",
      muted: "#1e2227",
      mutedForeground: "#a4a9b0",
      border: "#2a2f36",
      success: "#4cae83",
      warning: "#d0a34a",
      error: "#e06552",
    });
  }

  return correctRamp({
    primary,
    primaryForeground: readableForeground(primary),
    secondary,
    secondaryForeground: readableForeground(secondary),
    accent,
    accentForeground: readableForeground(accent),
    background: "#ffffff",
    foreground: "#141719",
    surface: "#f6f8fa",
    surfaceForeground: "#141719",
    muted: withLightness(primary, 0.96),
    mutedForeground: "#5b6570",
    border: withLightness(primary, 0.9),
    success: "#1a7f52",
    warning: "#b7791f",
    error: "#c0392b",
  });
}

/** Ensure each foreground/background pairing meets AA. */
function correctRamp(ramp: ColorRamp): ColorRamp {
  return {
    ...ramp,
    primaryForeground: ensureContrast(ramp.primaryForeground, ramp.primary, 4.5),
    secondaryForeground: ensureContrast(ramp.secondaryForeground, ramp.secondary, 4.5),
    accentForeground: ensureContrast(ramp.accentForeground, ramp.accent, 4.5),
    foreground: ensureContrast(ramp.foreground, ramp.background, 4.5),
    surfaceForeground: ensureContrast(ramp.surfaceForeground, ramp.surface, 4.5),
    mutedForeground: ensureContrast(ramp.mutedForeground, ramp.muted, 4.5),
  };
}

export interface ContrastAudit {
  pair: string;
  ratio: number;
  passesAA: boolean;
  passesAALarge: boolean;
}

/** Audit the key text/background pairings of a ramp for the accessibility panel. */
export function auditPalette(ramp: ColorRamp): ContrastAudit[] {
  const pairs: [string, string, string][] = [
    ["primary / on-primary", ramp.primaryForeground, ramp.primary],
    ["secondary / on-secondary", ramp.secondaryForeground, ramp.secondary],
    ["accent / on-accent", ramp.accentForeground, ramp.accent],
    ["text / background", ramp.foreground, ramp.background],
    ["text / surface", ramp.surfaceForeground, ramp.surface],
    ["muted-text / muted", ramp.mutedForeground, ramp.muted],
  ];
  return pairs.map(([pair, fg, bg]) => {
    const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
    return { pair, ratio, passesAA: ratio >= 4.5, passesAALarge: ratio >= 3 };
  });
}

/** Build a full Theme by grafting an extracted palette onto a preset's typography/layout. */
export function themeFromPalette(colors: string[], presetKey: string, mode: "light" | "dark" = "light"): Theme {
  const preset = getPreset(presetKey);
  return { ...preset, colors: buildPaletteFromColors(colors, mode) };
}

// Re-export the small utility used by the darker helper above.
export { hslToHex };
