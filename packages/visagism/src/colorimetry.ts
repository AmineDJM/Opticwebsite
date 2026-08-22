import type { SkinTone, Undertone } from "@optic/core";

/**
 * Colorimetry estimation (§15 step 6). From an average skin RGB sample, estimate a
 * skin tone bucket and an undertone (warm/cool/neutral). Deliberately cautious — the
 * UI must present this as an estimate, never a scientific verdict (§15).
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorimetryResult {
  skinTone: SkinTone;
  undertone: Undertone;
  confidence: number;
  metrics: { luminance: number; warmthIndex: number };
}

/** ITU-R BT.601 luma, 0..255. */
function luma({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function classifySkinTone(l: number): SkinTone {
  if (l >= 215) return "fair";
  if (l >= 185) return "light";
  if (l >= 150) return "medium";
  if (l >= 110) return "tan";
  return "deep";
}

/**
 * Undertone from the balance of red vs. blue (warm skins skew red/yellow, cool skins
 * skew blue/pink). The warmthIndex is (r - b) normalised by luma; a neutral band
 * around zero yields "neutral".
 */
export function estimateColorimetry(sample: RGB): ColorimetryResult {
  const l = luma(sample);
  const warmthIndex = (sample.r - sample.b) / Math.max(1, l);

  let undertone: Undertone;
  if (warmthIndex > 0.18) undertone = "warm";
  else if (warmthIndex < 0.06) undertone = "cool";
  else undertone = "neutral";

  // Confidence: stronger the further from the neutral band, but always modest — this
  // is an estimate. Extreme lighting (very dark/blown out) lowers confidence.
  const distanceFromNeutral = Math.min(0.25, Math.abs(warmthIndex - 0.12));
  const lightingPenalty = l < 60 || l > 245 ? 0.2 : 0;
  const confidence = Math.max(0.25, Math.min(0.8, 0.4 + distanceFromNeutral * 1.6 - lightingPenalty));

  return {
    skinTone: classifySkinTone(l),
    undertone,
    confidence: Math.round(confidence * 100) / 100,
    metrics: { luminance: Math.round(l), warmthIndex: Math.round(warmthIndex * 1000) / 1000 },
  };
}

/** Average a set of RGB samples (e.g. cheek-region pixels) into one. */
export function averageRgb(samples: readonly RGB[]): RGB {
  if (samples.length === 0) return { r: 0, g: 0, b: 0 };
  const sum = samples.reduce((acc, s) => ({ r: acc.r + s.r, g: acc.g + s.g, b: acc.b + s.b }), { r: 0, g: 0, b: 0 });
  return {
    r: Math.round(sum.r / samples.length),
    g: Math.round(sum.g / samples.length),
    b: Math.round(sum.b / samples.length),
  };
}
