import { FACE_SHAPE_FRAME_WEIGHTS, UNDERTONE_COLOR_AFFINITY, type RecommendationProfile } from "./profile.js";

/**
 * Recommendation engine (§16, §9). Pure function: (profile, products, rules) →
 * scored & ranked products with a short human reason. Deterministic and unit-tested;
 * no I/O, no framework, no camera.
 */

/** The subset of product data the engine reasons about (tags set in the admin). */
export interface RecommendableProduct {
  id: string;
  slug: string;
  name: string;
  frameShape?: string | null;
  colorPrimary?: string | null;
  styleProfiles?: string[];
  recommendedFaceShapes?: string[];
  recommendedColors?: string[];
  recommendedUndertones?: string[];
  avoidFaceShapes?: string[];
}

/** Admin override: adjust the weight of a (faceShape, frameShape) pair for a brand. */
export interface EngineRule {
  faceShape: string;
  frameShape: string;
  weight: number;
}

export interface ScoredProduct {
  product: RecommendableProduct;
  score: number;
  /** 0..100 for display. */
  matchPercent: number;
  reasons: string[];
}

export interface EngineOptions {
  rules?: EngineRule[];
  /** Products scoring below this (after normalisation) are dropped. Default 1. */
  minScore?: number;
  limit?: number;
}

const FRAME_SHAPE_LABELS_FR: Record<string, string> = {
  round: "rondes",
  square: "carrées",
  rectangle: "rectangulaires",
  oval: "ovales",
  aviator: "aviateur",
  cat_eye: "œil de chat",
  wayfarer: "wayfarer",
  browline: "browline",
  geometric: "géométriques",
  oversized: "oversize",
  rimless: "sans monture",
};

function faceShapeWeight(profile: RecommendationProfile, frameShape: string, rules: EngineRule[]): number {
  const override = rules.find((r) => r.faceShape === profile.faceShape && r.frameShape === frameShape);
  if (override) return override.weight;
  return FACE_SHAPE_FRAME_WEIGHTS[profile.faceShape]?.[frameShape] ?? 0;
}

/**
 * Score one product against a profile. The scoring blends:
 *  - explicit product tags (recommendedFaceShapes/avoid/undertones) — strong signal
 *  - frame-shape styling knowledge for the profile's face shape
 *  - colour/undertone harmony
 *  - style-profile match
 */
export function scoreProduct(
  profile: RecommendationProfile,
  product: RecommendableProduct,
  rules: EngineRule[] = [],
): ScoredProduct {
  let score = 0;
  const reasons: string[] = [];

  // 1. Explicit avoid tag is a hard penalty.
  if (product.avoidFaceShapes?.includes(profile.faceShape)) {
    score -= 6;
  }

  // 2. Explicit recommended-face-shape tag (curated by the merchant).
  if (product.recommendedFaceShapes?.includes(profile.faceShape)) {
    score += 5;
    reasons.push(`Recommandée pour les visages ${faceShapeLabel(profile.faceShape)}`);
  }

  // 3. Frame-shape styling knowledge.
  if (product.frameShape) {
    const w = faceShapeWeight(profile, product.frameShape, rules);
    score += w;
    if (w >= 3) {
      reasons.push(`Forme ${FRAME_SHAPE_LABELS_FR[product.frameShape] ?? product.frameShape} adaptée à votre visage`);
    } else if (w <= -2) {
      // discourage but keep, unless combined with other positives
      reasons.push(`Forme moins conseillée pour votre visage`);
    }
  }

  // 4. Undertone / colour harmony.
  if (profile.undertone) {
    if (product.recommendedUndertones?.includes(profile.undertone)) {
      score += 3;
      reasons.push(`Teinte assortie à votre sous-ton ${undertoneLabel(profile.undertone)}`);
    } else if (product.recommendedColors && product.recommendedColors.length > 0) {
      const affinity = UNDERTONE_COLOR_AFFINITY[profile.undertone] ?? [];
      if (product.recommendedColors.some((c) => affinity.includes(c))) {
        score += 2;
        reasons.push(`Couleur en harmonie avec votre carnation`);
      }
    }
  }

  // 5. Style-profile match.
  if (profile.styleProfile && product.styleProfiles?.includes(profile.styleProfile)) {
    score += 2;
    reasons.push(`Style ${profile.styleProfile}`);
  }

  return { product, score, matchPercent: 0, reasons };
}

/**
 * Rank a catalogue against a profile. `matchPercent` is normalised against the top
 * score so the best match reads ~100% (a friendly display metric, not a probability).
 */
export function recommend(
  profile: RecommendationProfile,
  products: readonly RecommendableProduct[],
  options: EngineOptions = {},
): ScoredProduct[] {
  const rules = options.rules ?? [];
  const minScore = options.minScore ?? 1;

  const scored = products
    .map((p) => scoreProduct(profile, p, rules))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));

  const top = scored[0]?.score ?? 1;
  const withPercent = scored.map((s) => ({
    ...s,
    // Map the top score to ~96–99% and scale down, floor at 55% so nothing shown
    // looks like a bad match (we already filtered those out).
    matchPercent: Math.max(55, Math.round((s.score / top) * 44) + 55),
    reasons: s.reasons.slice(0, 2),
  }));

  return options.limit ? withPercent.slice(0, options.limit) : withPercent;
}

/** Frame shapes the profile favours — used to pre-apply catalogue filters (§15.9). */
export function preferredFrameShapes(profile: RecommendationProfile, rules: EngineRule[] = []): string[] {
  const base = FACE_SHAPE_FRAME_WEIGHTS[profile.faceShape] ?? {};
  const merged = new Map<string, number>(Object.entries(base) as [string, number][]);
  for (const r of rules) {
    if (r.faceShape === profile.faceShape) merged.set(r.frameShape, r.weight);
  }
  return [...merged.entries()]
    .filter(([, w]) => w >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([shape]) => shape);
}

export function preferredColors(profile: RecommendationProfile): string[] {
  return profile.undertone ? (UNDERTONE_COLOR_AFFINITY[profile.undertone] ?? []) : [];
}

function faceShapeLabel(shape: string): string {
  const labels: Record<string, string> = {
    oval: "ovales",
    round: "ronds",
    square: "carrés",
    rectangle: "rectangulaires",
    heart: "en cœur",
    diamond: "en diamant",
    triangle: "triangulaires",
  };
  return labels[shape] ?? shape;
}

function undertoneLabel(u: string): string {
  return u === "warm" ? "chaud" : u === "cool" ? "froid" : "neutre";
}
