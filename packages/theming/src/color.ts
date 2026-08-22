/**
 * Colour maths — pure, dependency-free. Used by palette extraction and by the
 * accessibility checks (WCAG 2.2 contrast). Kept in @optic/theming so both the
 * generator (extract from logo) and the admin (theme editor) share one implementation.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const int = parseInt(h, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}
export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

export function adjustLightness(hex: string, delta: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, l: Math.max(0, Math.min(1, hsl.l + delta)) });
}

export function withLightness(hex: string, l: number): string {
  return hslToHex({ ...hexToHsl(hex), l: Math.max(0, Math.min(1, l)) });
}

export function rotateHue(hex: string, degrees: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({ ...hsl, h: (hsl.h + degrees + 360) % 360 });
}

/** WCAG relative luminance. */
export function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagLevel = "AAA" | "AA" | "AA-large" | "fail";

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

/** Pick black or white foreground for maximum contrast on a background. */
export function readableForeground(bgHex: string): string {
  return contrastRatio(bgHex, "#ffffff") >= contrastRatio(bgHex, "#111111") ? "#ffffff" : "#111111";
}

/**
 * Nudge a foreground colour's lightness until it meets a target contrast on the
 * given background, staying on the same hue. Returns the original if already passing
 * or if no adjustment reaches the target.
 */
export function ensureContrast(fgHex: string, bgHex: string, target = 4.5): string {
  if (contrastRatio(fgHex, bgHex) >= target) return fgHex;
  const bgLum = relativeLuminance(hexToRgb(bgHex));
  const goDarker = bgLum > 0.5;
  const hsl = hexToHsl(fgHex);
  let best = fgHex;
  let bestRatio = contrastRatio(fgHex, bgHex);
  for (let i = 1; i <= 20; i++) {
    const l = goDarker ? Math.max(0, hsl.l - i * 0.05) : Math.min(1, hsl.l + i * 0.05);
    const candidate = hslToHex({ ...hsl, l });
    const ratio = contrastRatio(candidate, bgHex);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
    if (ratio >= target) return candidate;
  }
  // No candidate reached the target: return whichever is stronger — the best hue-
  // preserving candidate found, or pure black/white.
  const extreme = goDarker ? "#111111" : "#ffffff";
  return contrastRatio(extreme, bgHex) > bestRatio ? extreme : best;
}
