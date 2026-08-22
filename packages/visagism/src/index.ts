import { profileFromManual, recommendationProfileSchema, type RecommendationProfile } from "@optic/recommendation";
import { classifyFaceShape, type FaceMeasurements, type FaceShapeResult } from "./geometry.js";
import { estimateColorimetry, type RGB, type ColorimetryResult } from "./colorimetry.js";

export * from "./geometry.js";
export * from "./colorimetry.js";
export * from "./manual.js";
export * from "./quality.js";

/**
 * Analysis → Profile bridge (§16). The automatic path combines face-shape geometry
 * and colorimetry into the same RecommendationProfile the manual path produces. The
 * recommendation engine is downstream of this and identical for both paths.
 */

export interface AutomaticAnalysisInput {
  measurements: FaceMeasurements;
  skinSample?: RGB;
  hairColor?: string;
  styleProfile?: string;
}

export interface AnalysisOutput {
  profile: RecommendationProfile;
  faceShape: FaceShapeResult;
  colorimetry?: ColorimetryResult;
}

export function analyzeAutomatic(input: AutomaticAnalysisInput): AnalysisOutput {
  const faceShape = classifyFaceShape(input.measurements);
  const colorimetry = input.skinSample ? estimateColorimetry(input.skinSample) : undefined;

  // Overall confidence is the product of the two estimates (both are uncertain).
  const confidence = colorimetry
    ? Math.round(faceShape.confidence * (0.6 + colorimetry.confidence * 0.4) * 100) / 100
    : faceShape.confidence;

  const profile = recommendationProfileSchema.parse({
    faceShape: faceShape.shape,
    undertone: colorimetry?.undertone,
    skinTone: colorimetry?.skinTone,
    hairColor: input.hairColor,
    styleProfile: input.styleProfile,
    confidence,
  });

  return { profile, faceShape, colorimetry };
}

export { profileFromManual };
export type { RecommendationProfile };
