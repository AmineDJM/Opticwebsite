/**
 * Optical domain vocabulary. These are the closed enumerations the engine reasons
 * about (face shapes, frame shapes, lens types…). They are NOT the category tree —
 * categories are fully administrable data. These are the tags the recommendation
 * and visagism engines match on, so they must be a stable, shared vocabulary.
 */

export const FACE_SHAPES = [
  "oval",
  "round",
  "square",
  "rectangle",
  "heart",
  "diamond",
  "triangle",
] as const;
export type FaceShape = (typeof FACE_SHAPES)[number];

export const FRAME_SHAPES = [
  "round",
  "square",
  "rectangle",
  "oval",
  "aviator",
  "cat_eye",
  "wayfarer",
  "browline",
  "geometric",
  "oversized",
  "rimless",
] as const;
export type FrameShape = (typeof FRAME_SHAPES)[number];

export const FRAME_MATERIALS = [
  "acetate",
  "metal",
  "titanium",
  "stainless_steel",
  "tr90",
  "wood",
  "mixed",
] as const;
export type FrameMaterial = (typeof FRAME_MATERIALS)[number];

export const FRAME_TYPES = ["full_rim", "half_rim", "rimless"] as const;
export type FrameType = (typeof FRAME_TYPES)[number];

export const UNDERTONES = ["warm", "cool", "neutral"] as const;
export type Undertone = (typeof UNDERTONES)[number];

export const SKIN_TONES = ["fair", "light", "medium", "tan", "deep"] as const;
export type SkinTone = (typeof SKIN_TONES)[number];

export const HAIR_COLORS = ["black", "brown", "blonde", "red", "grey", "other"] as const;
export type HairColor = (typeof HAIR_COLORS)[number];

export const STYLE_PROFILES = [
  "classic",
  "modern",
  "bold",
  "minimal",
  "vintage",
  "sporty",
  "luxury",
] as const;
export type StyleProfile = (typeof STYLE_PROFILES)[number];

/** What a frame or lens product can be fitted with. */
export const LENS_COMPATIBILITY = [
  "single_vision",
  "progressive",
  "bifocal",
  "sun_corrective",
  "photochromic",
  "blue_light",
  "reading",
  "non_prescription",
] as const;
export type LensCompatibility = (typeof LENS_COMPATIBILITY)[number];

/** Lens designs the quiz can orient towards. */
export const LENS_DESIGNS = [
  "single_vision",
  "progressive",
  "office",
  "sun_corrective",
  "reading",
] as const;
export type LensDesign = (typeof LENS_DESIGNS)[number];

/** Refractive indices, ordered thin-to-thick benefit. */
export const LENS_INDICES = ["1.50", "1.56", "1.59", "1.60", "1.67", "1.74"] as const;
export type LensIndex = (typeof LENS_INDICES)[number];

/** Lens treatments the quiz can recommend. Keys double as quiz-score buckets. */
export const LENS_TREATMENTS = [
  "anti_reflective",
  "hard_coat",
  "uv_protection",
  "photochromic",
  "polarized",
  "blue_light_filter",
  "anti_fog",
  "oleophobic",
] as const;
export type LensTreatment = (typeof LENS_TREATMENTS)[number];

export const SUN_LENS_TYPES = [
  "standard",
  "tinted",
  "gradient",
  "mirror",
  "polarized",
  "sun_corrective",
] as const;
export type SunLensType = (typeof SUN_LENS_TYPES)[number];

export const CONTACT_LENS_WEAR = ["daily", "monthly", "colored", "other"] as const;
export type ContactLensWear = (typeof CONTACT_LENS_WEAR)[number];

/** Type guards used at trust boundaries (form input, imported data). */
export function isFaceShape(v: unknown): v is FaceShape {
  return typeof v === "string" && (FACE_SHAPES as readonly string[]).includes(v);
}
export function isFrameShape(v: unknown): v is FrameShape {
  return typeof v === "string" && (FRAME_SHAPES as readonly string[]).includes(v);
}
export function isUndertone(v: unknown): v is Undertone {
  return typeof v === "string" && (UNDERTONES as readonly string[]).includes(v);
}
