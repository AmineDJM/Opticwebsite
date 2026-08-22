import { z } from "zod";
import {
  FACE_SHAPES,
  FRAME_SHAPES,
  UNDERTONES,
  SKIN_TONES,
  HAIR_COLORS,
  STYLE_PROFILES,
} from "@optic/core";

/**
 * RecommendationProfile — the abstract input to the recommendation engine (§16). It
 * is deliberately independent of *how* it was produced: the automatic camera path
 * and the manual questionnaire both emit one of these. The engine never sees a
 * camera or the DOM.
 */

export const recommendationProfileSchema = z.object({
  faceShape: z.enum(FACE_SHAPES),
  undertone: z.enum(UNDERTONES).optional(),
  skinTone: z.enum(SKIN_TONES).optional(),
  hairColor: z.enum(HAIR_COLORS).optional(),
  styleProfile: z.enum(STYLE_PROFILES).optional(),
  /** 0..1 — how confident the *producer* is (camera QC score, or 1 for manual). */
  confidence: z.number().min(0).max(1).default(1),
});

export type RecommendationProfile = z.infer<typeof recommendationProfileSchema>;

/**
 * Default frame-shape guidance by face shape. This is the domain knowledge of
 * face-shape styling: shapes that flatter (positive weight) and shapes to avoid
 * (negative). Admin `RecommendationRule` rows refine these per brand at runtime.
 */
export const FACE_SHAPE_FRAME_WEIGHTS: Record<string, Partial<Record<string, number>>> = {
  oval: { rectangle: 3, square: 3, aviator: 2, wayfarer: 2, cat_eye: 2, geometric: 2, round: 1, oversized: 1 },
  round: { rectangle: 4, square: 4, wayfarer: 3, browline: 3, geometric: 2, cat_eye: 1, round: -3, oversized: -1 },
  square: { round: 4, oval: 4, aviator: 3, cat_eye: 2, oversized: 2, rimless: 2, rectangle: -3, square: -3 },
  rectangle: { round: 3, oval: 3, oversized: 3, aviator: 2, wayfarer: 2, browline: 1, rectangle: -2 },
  heart: { aviator: 4, round: 3, oval: 3, cat_eye: 2, rimless: 2, wayfarer: 1, browline: -2, oversized: -1 },
  diamond: { cat_eye: 4, oval: 3, round: 3, browline: 3, rimless: 2, rectangle: -1, geometric: 1 },
  triangle: { cat_eye: 4, browline: 3, aviator: 2, oversized: 2, round: 1, rectangle: -1 },
};

/** Colour guidance by undertone: frame colours that harmonise. */
export const UNDERTONE_COLOR_AFFINITY: Record<string, string[]> = {
  warm: ["gold", "brown", "tortoise", "amber", "honey", "olive", "beige", "copper", "warm-red"],
  cool: ["silver", "black", "blue", "grey", "pink", "purple", "gunmetal", "clear", "burgundy"],
  neutral: ["tortoise", "brown", "black", "grey", "rose-gold", "taupe", "green"],
};

/** A validated manual selection maps 1:1 onto a profile with full confidence. */
export function profileFromManual(input: {
  faceShape: string;
  undertone?: string;
  skinTone?: string;
  hairColor?: string;
  styleProfile?: string;
}): RecommendationProfile {
  return recommendationProfileSchema.parse({ ...input, confidence: 1 });
}

export { FRAME_SHAPES };
