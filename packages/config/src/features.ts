/**
 * Feature flags. Every optional capability is a flag so a brand can turn it on or
 * off without code changes. Defaults are conservative; the seed enables the ones
 * Aura Optique demonstrates.
 */

export const FEATURE_KEYS = [
  "accounts", // customer accounts + login
  "guestCheckout",
  "coupons",
  "favorites",
  "reviews",
  "visagism", // face-shape recommendation module
  "visagismCamera", // allow camera/photo path (else manual only)
  "virtualTryOn",
  "lensQuiz", // the 20-question optician quiz
  "recentlyViewed",
  "newsletter",
  "search",
  "relatedProducts",
  "announcementBar",
  "multiCurrency",
  "instagramFeed",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureFlags = Record<FeatureKey, boolean>;

export const DEFAULT_FEATURES: FeatureFlags = {
  accounts: true,
  guestCheckout: true,
  coupons: true,
  favorites: true,
  reviews: false,
  visagism: true,
  visagismCamera: true,
  virtualTryOn: true,
  lensQuiz: true,
  recentlyViewed: true,
  newsletter: true,
  search: true,
  relatedProducts: true,
  announcementBar: true,
  multiCurrency: false,
  instagramFeed: false,
};

export function resolveFeatures(overrides: Partial<Record<string, boolean>>): FeatureFlags {
  const out = { ...DEFAULT_FEATURES };
  for (const key of FEATURE_KEYS) {
    if (typeof overrides[key] === "boolean") out[key] = overrides[key]!;
  }
  return out;
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  accounts: "Comptes clients",
  guestCheckout: "Commande sans compte",
  coupons: "Codes promotionnels",
  favorites: "Favoris",
  reviews: "Avis clients",
  visagism: "Visagisme IA",
  visagismCamera: "Analyse par caméra/photo",
  virtualTryOn: "Essayage virtuel",
  lensQuiz: "Quiz Verres (Opticien virtuel)",
  recentlyViewed: "Produits récemment consultés",
  newsletter: "Newsletter",
  search: "Recherche",
  relatedProducts: "Produits similaires",
  announcementBar: "Barre d'annonce",
  multiCurrency: "Multi-devises",
  instagramFeed: "Flux Instagram",
};
