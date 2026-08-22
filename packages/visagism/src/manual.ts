import { FACE_SHAPES, UNDERTONES, SKIN_TONES, HAIR_COLORS, STYLE_PROFILES } from "@optic/core";

/**
 * Manual visagism questionnaire (§16). Drives the "I'll choose myself" path with
 * illustrations and plain descriptions. This is data, so the UI stays declarative
 * and the same options can be localised. Output feeds `profileFromManual`.
 */

export interface ManualOption {
  value: string;
  label: string;
  description: string;
  /** Illustration hint the UI maps to an SVG/emoji; kept abstract here. */
  illustration: string;
}

export interface ManualStep {
  key: "faceShape" | "skinTone" | "undertone" | "hairColor" | "styleProfile";
  title: string;
  help: string;
  optional: boolean;
  options: ManualOption[];
}

export const MANUAL_STEPS: ManualStep[] = [
  {
    key: "faceShape",
    title: "Quelle est la forme de votre visage ?",
    help: "Regardez-vous dans un miroir et comparez le contour de votre visage.",
    optional: false,
    options: [
      { value: "oval", label: "Ovale", description: "Plus long que large, contours doux.", illustration: "oval" },
      { value: "round", label: "Rond", description: "Largeur et hauteur similaires, joues pleines.", illustration: "round" },
      { value: "square", label: "Carré", description: "Mâchoire marquée, front large.", illustration: "square" },
      { value: "rectangle", label: "Rectangle", description: "Visage allongé, mâchoire droite.", illustration: "rectangle" },
      { value: "heart", label: "Cœur", description: "Front large, menton fin.", illustration: "heart" },
      { value: "diamond", label: "Diamant", description: "Pommettes saillantes, front et menton étroits.", illustration: "diamond" },
      { value: "triangle", label: "Triangle", description: "Mâchoire plus large que le front.", illustration: "triangle" },
    ],
  },
  {
    key: "skinTone",
    title: "Votre carnation",
    help: "Choisissez la teinte la plus proche de votre peau.",
    optional: true,
    options: [
      { value: "fair", label: "Très claire", description: "Peau très claire.", illustration: "tone-fair" },
      { value: "light", label: "Claire", description: "Peau claire.", illustration: "tone-light" },
      { value: "medium", label: "Moyenne", description: "Peau moyenne.", illustration: "tone-medium" },
      { value: "tan", label: "Mate", description: "Peau mate.", illustration: "tone-tan" },
      { value: "deep", label: "Foncée", description: "Peau foncée.", illustration: "tone-deep" },
    ],
  },
  {
    key: "undertone",
    title: "Votre sous-ton",
    help: "Regardez vos veines : bleutées = froid, verdâtres = chaud.",
    optional: true,
    options: [
      { value: "warm", label: "Chaud", description: "Reflets dorés, veines verdâtres.", illustration: "undertone-warm" },
      { value: "cool", label: "Froid", description: "Reflets rosés, veines bleutées.", illustration: "undertone-cool" },
      { value: "neutral", label: "Neutre", description: "Un mélange des deux.", illustration: "undertone-neutral" },
    ],
  },
  {
    key: "hairColor",
    title: "Couleur de cheveux",
    help: "Votre couleur actuelle.",
    optional: true,
    options: [
      { value: "black", label: "Noir", description: "", illustration: "hair-black" },
      { value: "brown", label: "Châtain / Brun", description: "", illustration: "hair-brown" },
      { value: "blonde", label: "Blond", description: "", illustration: "hair-blonde" },
      { value: "red", label: "Roux", description: "", illustration: "hair-red" },
      { value: "grey", label: "Gris / Blanc", description: "", illustration: "hair-grey" },
      { value: "other", label: "Autre", description: "", illustration: "hair-other" },
    ],
  },
  {
    key: "styleProfile",
    title: "Le style que vous recherchez",
    help: "Quelle allure souhaitez-vous ?",
    optional: true,
    options: [
      { value: "classic", label: "Classique", description: "Intemporel et sobre.", illustration: "style-classic" },
      { value: "modern", label: "Moderne", description: "Contemporain et épuré.", illustration: "style-modern" },
      { value: "bold", label: "Affirmé", description: "Qui se remarque.", illustration: "style-bold" },
      { value: "minimal", label: "Minimaliste", description: "Discret et léger.", illustration: "style-minimal" },
      { value: "vintage", label: "Vintage", description: "Rétro et caractériel.", illustration: "style-vintage" },
      { value: "sporty", label: "Sportif", description: "Dynamique et résistant.", illustration: "style-sporty" },
      { value: "luxury", label: "Luxe", description: "Raffiné et premium.", illustration: "style-luxury" },
    ],
  },
];

/** Validate a manual answer against the allowed vocabulary. */
export function isValidManualAnswer(key: ManualStep["key"], value: string): boolean {
  const sets: Record<ManualStep["key"], readonly string[]> = {
    faceShape: FACE_SHAPES,
    skinTone: SKIN_TONES,
    undertone: UNDERTONES,
    hairColor: HAIR_COLORS,
    styleProfile: STYLE_PROFILES,
  };
  return sets[key].includes(value);
}
