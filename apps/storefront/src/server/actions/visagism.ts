"use server";

import { z } from "zod";
import { FACE_SHAPES, UNDERTONES, SKIN_TONES, HAIR_COLORS, STYLE_PROFILES } from "@optic/core";
import { profileFromManual, recommend, preferredFrameShapes, type RecommendationProfile } from "@optic/recommendation";
import { getTenant } from "../tenant.js";

/**
 * Visagism server action. Accepts a RecommendationProfile (produced by EITHER the
 * manual questionnaire OR the in-browser camera analysis — the engine is identical
 * for both, §16), matches it against the catalogue's tags, and returns scored
 * recommendations. Optionally persists the abstract profile (never an image, §17).
 */

const profileInputSchema = z.object({
  faceShape: z.enum(FACE_SHAPES),
  undertone: z.enum(UNDERTONES).optional(),
  skinTone: z.enum(SKIN_TONES).optional(),
  hairColor: z.enum(HAIR_COLORS).optional(),
  styleProfile: z.enum(STYLE_PROFILES).optional(),
  confidence: z.number().min(0).max(1).default(1),
  source: z.enum(["AUTOMATIC", "MANUAL"]).default("MANUAL"),
  save: z.boolean().default(false),
  metrics: z.record(z.string(), z.number()).optional(),
});

export interface VisagismRecommendation {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  priceCents: number;
  comparePriceCents: number | null;
  imageUrl: string | null;
  matchPercent: number;
  matchReason: string;
}

export interface VisagismResult {
  ok: boolean;
  error?: string;
  profile?: RecommendationProfile & { source: string };
  recommendations?: VisagismRecommendation[];
  preferredShapes?: string[];
  catalogueUrl?: string;
}

export async function getVisagismRecommendations(input: unknown): Promise<VisagismResult> {
  const tenant = await getTenant();
  if (!tenant.features.visagism) return { ok: false, error: "Module désactivé" };

  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Profil invalide" };
  const data = parsed.data;

  const profile = profileFromManual({
    faceShape: data.faceShape,
    undertone: data.undertone,
    skinTone: data.skinTone,
    hairColor: data.hairColor,
    styleProfile: data.styleProfile,
  });
  profile.confidence = data.confidence;

  // Load admin recommendation-rule overrides (tenant-scoped).
  const rules = (await tenant.db.recommendationRule.findMany({ where: { isActive: true } as never })) as never as {
    faceShape: string;
    frameShape: string;
    weight: number;
  }[];

  // Candidate products: frames/sunglasses with matching tags. Pull a generous set and
  // let the engine rank.
  const products = (await tenant.db.product.findMany({
    where: { status: "ACTIVE" } as never,
    take: 100,
    include: { brand: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" }, include: { media: { select: { url: true } } } } },
  })) as never as Array<{
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    comparePriceCents: number | null;
    frameShape: string | null;
    colorPrimary: string | null;
    styleProfiles: string[];
    recommendedFaceShapes: string[];
    recommendedColors: string[];
    recommendedUndertones: string[];
    avoidFaceShapes: string[];
    brand: { name: string } | null;
    images: { media: { url: string } }[];
  }>;

  const scored = recommend(
    profile,
    products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      frameShape: p.frameShape,
      colorPrimary: p.colorPrimary,
      styleProfiles: p.styleProfiles,
      recommendedFaceShapes: p.recommendedFaceShapes,
      recommendedColors: p.recommendedColors,
      recommendedUndertones: p.recommendedUndertones,
      avoidFaceShapes: p.avoidFaceShapes,
    })),
    { rules, limit: 8, minScore: 1 },
  );

  const byId = new Map(products.map((p) => [p.id, p]));
  const recommendations: VisagismRecommendation[] = scored.map((s) => {
    const p = byId.get(s.product.id)!;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brandName: p.brand?.name ?? null,
      priceCents: p.priceCents,
      comparePriceCents: p.comparePriceCents,
      imageUrl: p.images[0]?.media.url ?? null,
      matchPercent: s.matchPercent,
      matchReason: s.reasons[0] ?? "Adaptée à votre profil",
    };
  });

  const shapes = preferredFrameShapes(profile, rules);

  // Persist the abstract profile only with consent (§17) — never an image.
  if (data.save) {
    try {
      await tenant.db.visagismProfile.create({
        data: {
          source: data.source,
          faceShape: profile.faceShape,
          skinTone: profile.skinTone ?? null,
          undertone: profile.undertone ?? null,
          hairColor: profile.hairColor ?? null,
          styleProfile: profile.styleProfile ?? null,
          confidence: profile.confidence,
          metrics: data.metrics ?? undefined,
        } as never,
      });
    } catch {
      // non-fatal
    }
  }

  const catalogueUrl = shapes.length ? `/boutique?shape=${shapes.slice(0, 3).join(",")}` : "/boutique";

  return {
    ok: true,
    profile: { ...profile, source: data.source },
    recommendations,
    preferredShapes: shapes,
    catalogueUrl,
  };
}
