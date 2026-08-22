/**
 * Aura Optique — the first brand produced by the engine, seeded as a complete demo
 * (§43). It is *data*: nothing here is special-cased in the engine. All demo products
 * are clearly marked (SKU prefix AURA-DEMO) and flagged as demo so they are never
 * confused with real inventory.
 *
 * Palette is derived from Aura's premium teal/gold identity (the generator would
 * normally extract this from an uploaded logo; here it is provided directly).
 */
import { buildPaletteFromColors } from "@optic/theming";

export const AURA_PRIMARY = "#0e5f68"; // deep teal
export const AURA_ACCENT = "#c8a24a"; // warm gold

export const auraColors = (() => {
  const ramp = buildPaletteFromColors([AURA_PRIMARY, "#123c4a", AURA_ACCENT], "light");
  return ramp;
})();

export interface DemoVariant {
  sku: string;
  name: string;
  colorName: string;
  colorHex: string;
  size?: string;
  stock: number;
  priceCents?: number;
}

export interface DemoProduct {
  sku: string;
  name: string;
  slug: string;
  brand: string;
  categorySlugs: string[];
  gender: "MEN" | "WOMEN" | "UNISEX" | "KIDS";
  ageGroup: "ADULT" | "TEEN" | "CHILD";
  shortDescription: string;
  description: string;
  priceCents: number;
  comparePriceCents?: number;
  frameShape?: string;
  frameMaterial?: string;
  frameType?: string;
  colorPrimary?: string;
  lensWidthMm?: number;
  bridgeWidthMm?: number;
  templeLengthMm?: number;
  weightGrams?: number;
  lensCompatibility?: string[];
  recommendedFaceShapes?: string[];
  recommendedColors?: string[];
  recommendedUndertones?: string[];
  avoidFaceShapes?: string[];
  styleProfiles?: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  isFeatured?: boolean;
  variants: DemoVariant[];
}

const P = (dzd: number) => dzd * 100; // DZD → santeem

export const AURA_BRANDS = [
  {
    slug: "momus",
    name: "Momus",
    isExclusive: true,
    isFeatured: true,
    description: "La marque exclusive d'Aura Optique. Un design affirmé, une fabrication soignée.",
    story:
      "Née dans les ateliers d'Aura Optique, Momus incarne une vision : des montures au caractère fort, pensées pour durer. Chaque collection marie acétate italien, lignes contemporaines et un souci du détail hérité de la haute lunetterie.",
  },
  { slug: "atelier-aura", name: "Atelier Aura", isFeatured: true, description: "La ligne maison, sobre et intemporelle." },
  { slug: "lumen", name: "Lumen", description: "Montures légères en titane." },
  { slug: "solis", name: "Solis", description: "Spécialiste du solaire premium." },
  { slug: "clara", name: "Clara", description: "Élégance féminine et couleurs douces." },
  { slug: "vista-kids", name: "Vista Kids", description: "Résistantes et colorées, pensées pour les enfants." },
];

export const AURA_CATEGORIES = [
  { slug: "montures", name: "Montures médicales", kind: "OPTICAL_FRAMES" as const, children: [
    { slug: "montures-homme", name: "Homme" },
    { slug: "montures-femme", name: "Femme" },
    { slug: "montures-enfant", name: "Enfant" },
  ]},
  { slug: "solaires", name: "Lunettes solaires", kind: "SUNGLASSES" as const, children: [
    { slug: "solaires-homme", name: "Homme" },
    { slug: "solaires-femme", name: "Femme" },
    { slug: "solaires-enfant", name: "Enfant" },
  ]},
  { slug: "verres-solaires", name: "Verres solaires seuls", kind: "SUN_LENSES" as const, children: [] },
  { slug: "lentilles", name: "Lentilles de contact", kind: "CONTACT_LENSES" as const, children: [
    { slug: "lentilles-journalieres", name: "Journalières" },
    { slug: "lentilles-mensuelles", name: "Mensuelles" },
    { slug: "lentilles-couleur", name: "Couleur" },
  ]},
];

export const AURA_PRODUCTS: DemoProduct[] = [
  // ---- Momus (exclusive) ----
  {
    sku: "AURA-DEMO-MOM-01", name: "Momus Astra", slug: "momus-astra", brand: "momus",
    categorySlugs: ["montures-homme"], gender: "MEN", ageGroup: "ADULT",
    shortDescription: "Monture rectangulaire en acétate, signature Momus.",
    description: "L'Astra affirme un style masculin contemporain. Acétate italien, charnières renforcées et un profil rectangulaire qui structure le regard.",
    priceCents: P(8900), comparePriceCents: P(11900),
    frameShape: "rectangle", frameMaterial: "acetate", frameType: "full_rim", colorPrimary: "black",
    lensWidthMm: 54, bridgeWidthMm: 18, templeLengthMm: 145, weightGrams: 28,
    lensCompatibility: ["single_vision", "progressive", "blue_light", "photochromic"],
    recommendedFaceShapes: ["round", "oval"], recommendedColors: ["black", "tortoise"], recommendedUndertones: ["cool", "neutral"],
    styleProfiles: ["modern", "classic"], isFeatured: true, isBestseller: true,
    variants: [
      { sku: "AURA-DEMO-MOM-01-BLK", name: "Noir", colorName: "black", colorHex: "#111111", stock: 25 },
      { sku: "AURA-DEMO-MOM-01-TOR", name: "Écaille", colorName: "tortoise", colorHex: "#6b4423", stock: 14 },
    ],
  },
  {
    sku: "AURA-DEMO-MOM-02", name: "Momus Vela", slug: "momus-vela", brand: "momus",
    categorySlugs: ["montures-femme"], gender: "WOMEN", ageGroup: "ADULT",
    shortDescription: "Cat-eye délicat, acétate cristal.",
    description: "La Vela réinterprète le cat-eye avec finesse. Une monture féminine qui illumine le visage, en acétate cristal aux reflets subtils.",
    priceCents: P(9500),
    frameShape: "cat_eye", frameMaterial: "acetate", frameType: "full_rim", colorPrimary: "burgundy",
    lensWidthMm: 52, bridgeWidthMm: 17, templeLengthMm: 140, weightGrams: 24,
    lensCompatibility: ["single_vision", "progressive", "blue_light"],
    recommendedFaceShapes: ["diamond", "square", "heart"], recommendedColors: ["burgundy", "rose-gold"], recommendedUndertones: ["warm"],
    styleProfiles: ["luxury", "vintage"], isFeatured: true, isNew: true,
    variants: [
      { sku: "AURA-DEMO-MOM-02-BRG", name: "Bordeaux", colorName: "burgundy", colorHex: "#6d2233", stock: 18 },
      { sku: "AURA-DEMO-MOM-02-CRY", name: "Cristal", colorName: "clear", colorHex: "#d9d4cc", stock: 9 },
    ],
  },
  {
    sku: "AURA-DEMO-MOM-03", name: "Momus Orion", slug: "momus-orion", brand: "momus",
    categorySlugs: ["solaires-homme"], gender: "UNISEX", ageGroup: "ADULT",
    shortDescription: "Solaire aviateur, verres polarisés.",
    description: "L'Orion, icône solaire de Momus. Monture métal fine, verres polarisés catégorie 3 pour une protection optimale.",
    priceCents: P(12500), comparePriceCents: P(14900),
    frameShape: "aviator", frameMaterial: "metal", frameType: "full_rim", colorPrimary: "gold",
    lensWidthMm: 58, bridgeWidthMm: 14, templeLengthMm: 140, weightGrams: 30,
    lensCompatibility: ["sun_corrective", "non_prescription"],
    recommendedFaceShapes: ["square", "heart", "oval"], recommendedColors: ["gold", "gunmetal"], recommendedUndertones: ["warm", "neutral"],
    styleProfiles: ["classic", "luxury"], isBestseller: true, isFeatured: true,
    variants: [
      { sku: "AURA-DEMO-MOM-03-GLD", name: "Or", colorName: "gold", colorHex: "#c8a24a", stock: 30 },
      { sku: "AURA-DEMO-MOM-03-GUN", name: "Gunmetal", colorName: "gunmetal", colorHex: "#4a4e54", stock: 12 },
    ],
  },
  {
    sku: "AURA-DEMO-MOM-04", name: "Momus Lyra", slug: "momus-lyra", brand: "momus",
    categorySlugs: ["montures-femme"], gender: "WOMEN", ageGroup: "ADULT",
    shortDescription: "Ronde fine, titane rosé.",
    description: "La Lyra joue la légèreté du titane et la douceur d'une forme ronde. Un modèle minimaliste au raffinement discret.",
    priceCents: P(10900), isNew: true,
    frameShape: "round", frameMaterial: "titanium", frameType: "rimless", colorPrimary: "rose-gold",
    lensWidthMm: 49, bridgeWidthMm: 20, templeLengthMm: 140, weightGrams: 15,
    lensCompatibility: ["single_vision", "progressive", "blue_light", "reading"],
    recommendedFaceShapes: ["square", "rectangle", "heart"], recommendedColors: ["rose-gold", "silver"], recommendedUndertones: ["cool"],
    avoidFaceShapes: ["round"], styleProfiles: ["minimal", "luxury"],
    variants: [
      { sku: "AURA-DEMO-MOM-04-RSG", name: "Or rosé", colorName: "rose-gold", colorHex: "#b76e79", stock: 16 },
    ],
  },
];

// ---- Other brands (frames, sun, kids, contacts) generated programmatically to keep
// the file readable while producing a realistic catalogue. ----
function frame(
  n: number,
  o: Partial<DemoProduct> & { name: string; brand: string; categorySlugs: string[]; gender: DemoProduct["gender"]; priceCents: number; frameShape: string },
): DemoProduct {
  const slug = o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    sku: `AURA-DEMO-${String(n).padStart(3, "0")}`,
    slug,
    ageGroup: "ADULT",
    shortDescription: o.shortDescription ?? `Monture ${o.frameShape}.`,
    description: o.description ?? `Un modèle ${o.frameShape} de la collection ${o.brand}, pensé pour le confort au quotidien.`,
    frameMaterial: o.frameMaterial ?? "acetate",
    frameType: o.frameType ?? "full_rim",
    lensCompatibility: o.lensCompatibility ?? ["single_vision", "progressive", "blue_light"],
    variants: o.variants ?? [
      { sku: `AURA-DEMO-${String(n).padStart(3, "0")}-A`, name: "Noir", colorName: "black", colorHex: "#111111", stock: 20 },
      { sku: `AURA-DEMO-${String(n).padStart(3, "0")}-B`, name: "Écaille", colorName: "tortoise", colorHex: "#6b4423", stock: 10 },
    ],
    ...o,
  } as DemoProduct;
}

AURA_PRODUCTS.push(
  frame(10, { name: "Atelier Aura Meridien", brand: "atelier-aura", categorySlugs: ["montures-homme"], gender: "MEN", priceCents: P(6900), frameShape: "square", recommendedFaceShapes: ["round", "oval"], styleProfiles: ["classic"], isFeatured: true }),
  frame(11, { name: "Atelier Aura Solene", brand: "atelier-aura", categorySlugs: ["montures-femme"], gender: "WOMEN", priceCents: P(7200), frameShape: "oval", recommendedFaceShapes: ["square", "rectangle"], styleProfiles: ["minimal"], isNew: true }),
  frame(12, { name: "Lumen Air", brand: "lumen", categorySlugs: ["montures-homme"], gender: "UNISEX", priceCents: P(9900), frameShape: "rectangle", frameMaterial: "titanium", frameType: "half_rim", weightGrams: 12, recommendedFaceShapes: ["round"], styleProfiles: ["modern", "sporty"], isBestseller: true, variants: [{ sku: "AURA-DEMO-012-A", name: "Argent", colorName: "silver", colorHex: "#c0c4c8", stock: 22 }, { sku: "AURA-DEMO-012-B", name: "Bleu nuit", colorName: "blue", colorHex: "#1b2a4a", stock: 8 }] }),
  frame(13, { name: "Lumen Halo", brand: "lumen", categorySlugs: ["montures-femme"], gender: "WOMEN", priceCents: P(9400), frameShape: "round", frameMaterial: "titanium", recommendedFaceShapes: ["square", "heart"], recommendedUndertones: ["cool"], styleProfiles: ["minimal"] }),
  frame(14, { name: "Clara Petale", brand: "clara", categorySlugs: ["montures-femme"], gender: "WOMEN", priceCents: P(6500), comparePriceCents: P(7900), frameShape: "cat_eye", recommendedFaceShapes: ["diamond", "square"], recommendedColors: ["rose-gold", "burgundy"], recommendedUndertones: ["warm"], styleProfiles: ["vintage"], isBestseller: true }),
  frame(15, { name: "Clara Aube", brand: "clara", categorySlugs: ["montures-femme"], gender: "WOMEN", priceCents: P(7100), frameShape: "oval", recommendedFaceShapes: ["rectangle", "square"], styleProfiles: ["classic"] }),
  frame(16, { name: "Atelier Aura Cadet", brand: "vista-kids", categorySlugs: ["montures-enfant"], gender: "KIDS", priceCents: P(4500), frameShape: "round", frameMaterial: "tr90", recommendedFaceShapes: ["oval"], styleProfiles: ["sporty"], variants: [{ sku: "AURA-DEMO-016-A", name: "Bleu", colorName: "blue", colorHex: "#2563eb", stock: 30 }, { sku: "AURA-DEMO-016-B", name: "Rouge", colorName: "warm-red", colorHex: "#dc2626", stock: 25 }] }),
);
AURA_PRODUCTS[AURA_PRODUCTS.length - 1]!.ageGroup = "CHILD";

// ---- Sunglasses ----
AURA_PRODUCTS.push(
  frame(20, { name: "Solis Riva", brand: "solis", categorySlugs: ["solaires-femme"], gender: "WOMEN", priceCents: P(8900), frameShape: "oversized", frameMaterial: "acetate", lensCompatibility: ["sun_corrective", "non_prescription"], recommendedFaceShapes: ["heart", "oval"], styleProfiles: ["luxury", "bold"], isFeatured: true, variants: [{ sku: "AURA-DEMO-020-A", name: "Noir", colorName: "black", colorHex: "#111111", stock: 18 }, { sku: "AURA-DEMO-020-B", name: "Havane", colorName: "tortoise", colorHex: "#7a4a1e", stock: 11 }] }),
  frame(21, { name: "Solis Cap", brand: "solis", categorySlugs: ["solaires-homme"], gender: "MEN", priceCents: P(9900), frameShape: "wayfarer", frameMaterial: "acetate", lensCompatibility: ["sun_corrective", "non_prescription"], recommendedFaceShapes: ["round", "oval"], styleProfiles: ["classic"], isBestseller: true }),
  frame(22, { name: "Solis Mistral", brand: "solis", categorySlugs: ["solaires-homme"], gender: "UNISEX", priceCents: P(11200), frameShape: "aviator", frameMaterial: "metal", lensCompatibility: ["sun_corrective", "non_prescription"], recommendedFaceShapes: ["square", "heart"], styleProfiles: ["sporty"], isNew: true }),
);

// ---- Contact lenses (no frame attributes) ----
export const AURA_CONTACT_PRODUCTS: DemoProduct[] = [
  {
    sku: "AURA-DEMO-CL-01", name: "Aura Daily Clear (30)", slug: "aura-daily-clear-30", brand: "atelier-aura",
    categorySlugs: ["lentilles-journalieres"], gender: "UNISEX", ageGroup: "ADULT",
    shortDescription: "Lentilles journalières, boîte de 30.", description: "Lentilles journalières hydratantes, confort toute la journée. Boîte de 30 lentilles.",
    priceCents: P(2500), lensCompatibility: ["non_prescription"], styleProfiles: [],
    variants: [{ sku: "AURA-DEMO-CL-01-STD", name: "Boîte de 30", colorName: "clear", colorHex: "#e8f0f2", stock: 100 }],
  },
  {
    sku: "AURA-DEMO-CL-02", name: "Aura Monthly (6)", slug: "aura-monthly-6", brand: "atelier-aura",
    categorySlugs: ["lentilles-mensuelles"], gender: "UNISEX", ageGroup: "ADULT",
    shortDescription: "Lentilles mensuelles, boîte de 6.", description: "Lentilles mensuelles respirantes en silicone hydrogel. Boîte de 6.",
    priceCents: P(3900), lensCompatibility: ["non_prescription"], styleProfiles: [],
    variants: [{ sku: "AURA-DEMO-CL-02-STD", name: "Boîte de 6", colorName: "clear", colorHex: "#e8f0f2", stock: 60 }],
  },
  {
    sku: "AURA-DEMO-CL-03", name: "Aura Color Hazel (2)", slug: "aura-color-hazel-2", brand: "clara",
    categorySlugs: ["lentilles-couleur"], gender: "UNISEX", ageGroup: "ADULT",
    shortDescription: "Lentilles de couleur noisette.", description: "Sublimez votre regard avec une teinte noisette naturelle. Boîte de 2.",
    priceCents: P(4200), isNew: true, lensCompatibility: ["non_prescription"], styleProfiles: [],
    variants: [{ sku: "AURA-DEMO-CL-03-HAZ", name: "Noisette", colorName: "amber", colorHex: "#a97142", stock: 40 }],
  },
];

export const AURA_COUPONS = [
  { code: "BIENVENUE10", type: "PERCENTAGE" as const, value: 10, minSubtotalCents: P(5000), maxDiscountCents: P(3000) },
  { code: "LIVRAISONOFFERTE", type: "FREE_SHIPPING" as const, value: 0, minSubtotalCents: P(10000) },
];
