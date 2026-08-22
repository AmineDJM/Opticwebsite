import { z } from "zod";

/**
 * Block registry — the vocabulary of the page builder (§5). Each block type has a
 * zod schema for its props; the admin validates against it before writing a
 * ContentBlock, and the storefront's BlockRenderer switches on `type`. Adding a
 * block is: add a schema here + a renderer in @optic/ui. No page-builder engine to
 * fight with, just typed, ordered, toggleable blocks.
 */

const ctaSchema = z.object({ label: z.string(), href: z.string() }).partial();
const imageRefSchema = z.object({ mediaId: z.string().optional(), url: z.string().optional(), alt: z.string().optional() });

export const BLOCK_SCHEMAS = {
  hero: z.object({
    heading: z.string().default("Votre regard, sublimé"),
    subheading: z.string().optional(),
    eyebrow: z.string().optional(),
    image: imageRefSchema.optional(),
    align: z.enum(["left", "center"]).default("left"),
    overlay: z.number().min(0).max(1).default(0.25),
    primaryCta: ctaSchema.optional(),
    secondaryCta: ctaSchema.optional(),
    height: z.enum(["md", "lg", "full"]).default("lg"),
  }),
  announcement: z.object({
    text: z.string(),
    href: z.string().optional(),
    dismissible: z.boolean().default(true),
  }),
  banner: z.object({
    heading: z.string(),
    text: z.string().optional(),
    image: imageRefSchema.optional(),
    cta: ctaSchema.optional(),
    layout: z.enum(["left", "right", "full"]).default("left"),
    background: z.enum(["surface", "primary", "accent", "muted"]).default("surface"),
  }),
  featuredCategories: z.object({
    heading: z.string().default("Nos catégories"),
    categorySlugs: z.array(z.string()).default([]),
    columns: z.number().int().min(2).max(6).default(4),
  }),
  featuredProducts: z.object({
    heading: z.string().default("Sélection"),
    source: z.enum(["manual", "featured", "bestsellers", "new"]).default("featured"),
    productSlugs: z.array(z.string()).default([]),
    limit: z.number().int().min(2).max(24).default(8),
  }),
  newArrivals: z.object({
    heading: z.string().default("Nouveautés"),
    limit: z.number().int().min(2).max(24).default(8),
  }),
  bestSellers: z.object({
    heading: z.string().default("Meilleures ventes"),
    limit: z.number().int().min(2).max(24).default(8),
  }),
  brands: z.object({
    heading: z.string().default("Les marques"),
    brandSlugs: z.array(z.string()).default([]),
    grayscale: z.boolean().default(true),
  }),
  brandHighlight: z.object({
    brandSlug: z.string(),
    heading: z.string().optional(),
    text: z.string().optional(),
    image: imageRefSchema.optional(),
    cta: ctaSchema.optional(),
    theme: z.enum(["light", "dark"]).default("dark"),
  }),
  promotions: z.object({
    heading: z.string().default("Promotions"),
    limit: z.number().int().min(2).max(24).default(8),
  }),
  visagismCta: z.object({
    heading: z.string().default("Trouvez la monture faite pour votre visage"),
    text: z.string().optional(),
    image: imageRefSchema.optional(),
    cta: ctaSchema.optional(),
  }),
  virtualTryOnCta: z.object({
    heading: z.string().default("Essayez avant d'acheter"),
    text: z.string().optional(),
    image: imageRefSchema.optional(),
    cta: ctaSchema.optional(),
  }),
  quizCta: z.object({
    heading: z.string().default("Quel verre est fait pour vous ?"),
    text: z.string().optional(),
    image: imageRefSchema.optional(),
    cta: ctaSchema.optional(),
  }),
  advantages: z.object({
    heading: z.string().optional(),
    items: z
      .array(z.object({ icon: z.string().optional(), title: z.string(), text: z.string().optional() }))
      .default([]),
  }),
  testimonials: z.object({
    heading: z.string().default("Ils nous font confiance"),
    items: z
      .array(z.object({ author: z.string(), quote: z.string(), rating: z.number().min(1).max(5).optional() }))
      .default([]),
  }),
  faq: z.object({
    heading: z.string().default("Questions fréquentes"),
    items: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
  newsletter: z.object({
    heading: z.string().default("Restez informé"),
    text: z.string().optional(),
    background: z.enum(["surface", "primary", "accent", "muted"]).default("muted"),
  }),
  socialFeed: z.object({
    heading: z.string().default("Suivez-nous"),
    handle: z.string().optional(),
    images: z.array(imageRefSchema).default([]),
  }),
  richText: z.object({
    heading: z.string().optional(),
    html: z.string().default(""),
    width: z.enum(["prose", "full"]).default("prose"),
  }),
} as const;

export type BlockType = keyof typeof BLOCK_SCHEMAS;

export const BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS) as BlockType[];

export interface BlockDefinition {
  type: BlockType;
  props: Record<string, unknown>;
  isEnabled: boolean;
  position: number;
  id?: string;
}

/** Parse+default a block's props against its schema. Unknown type → passthrough. */
export function parseBlockProps(type: string, props: unknown): Record<string, unknown> {
  const schema = BLOCK_SCHEMAS[type as BlockType];
  if (!schema) return (props as Record<string, unknown>) ?? {};
  const result = schema.safeParse(props ?? {});
  return result.success ? result.data : schema.parse({});
}

export function isBlockType(type: string): type is BlockType {
  return type in BLOCK_SCHEMAS;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  announcement: "Barre d'annonce",
  banner: "Bannière",
  featuredCategories: "Catégories mises en avant",
  featuredProducts: "Produits mis en avant",
  newArrivals: "Nouveautés",
  bestSellers: "Meilleures ventes",
  brands: "Marques",
  brandHighlight: "Marque exclusive",
  promotions: "Promotions",
  visagismCta: "CTA Visagisme",
  virtualTryOnCta: "CTA Essayage virtuel",
  quizCta: "CTA Quiz Verres",
  advantages: "Avantages",
  testimonials: "Témoignages",
  faq: "FAQ",
  newsletter: "Newsletter",
  socialFeed: "Réseaux sociaux",
  richText: "Texte enrichi",
};
