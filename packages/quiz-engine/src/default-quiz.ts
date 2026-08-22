import { quizSchema, type QuizDef } from "./types.js";
import type { z } from "zod";

/**
 * The default "Opticien virtuel" quiz — 20 questions in 5 sections (§21). Seeded into
 * every new website and fully editable in the admin Quiz Builder. Weights feed the
 * lens score buckets; rules add the §23 conditional logic (e.g. heavy screen use +
 * night driving → boost anti-reflective).
 *
 * This is guidance, not diagnosis — see the disclaimer.
 *
 * Declared with the schema INPUT type (so per-field defaults may be omitted here) and
 * exported after parsing, which applies defaults and guarantees validity.
 */
const DEFAULT_QUIZ_INPUT: z.input<typeof quizSchema> = {
  key: "lens-advisor",
  name: "L'Opticien virtuel",
  disclaimer:
    "Cette recommandation aide à orienter votre choix et ne remplace pas un examen de la vue ou les conseils d'un professionnel de santé qualifié.",
  sections: [
    { key: "profile", title: "Profil visuel", subtitle: "Faisons connaissance" },
    { key: "digital", title: "Usage numérique", subtitle: "Vos écrans au quotidien" },
    { key: "driving", title: "Conduite & environnement", subtitle: "Vos déplacements" },
    { key: "lifestyle", title: "Mode de vie", subtitle: "Vos activités" },
    { key: "comfort", title: "Confort visuel", subtitle: "Votre ressenti" },
  ],
  questions: [
    // A. PROFIL VISUEL (Q1–Q4)
    {
      key: "age_range",
      sectionKey: "profile",
      label: "Quelle est votre tranche d'âge ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "under25", label: "Moins de 25 ans", weights: {} },
        { key: "25_40", label: "25 à 40 ans", weights: {} },
        { key: "40_55", label: "40 à 55 ans", weights: { progressive: 1 } },
        { key: "over55", label: "Plus de 55 ans", weights: { progressive: 2 } },
      ],
    },
    {
      key: "known_correction",
      sectionKey: "profile",
      label: "Avez-vous une correction connue ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "myopia", label: "Myopie (vision de loin)", weights: { single_vision: 1, "1.60": 1 } },
        { key: "hyperopia", label: "Hypermétropie (vision de près)", weights: { single_vision: 1 } },
        { key: "astigmatism", label: "Astigmatisme", weights: { single_vision: 1 } },
        { key: "presbyopia", label: "Presbytie (lecture après 40 ans)", weights: { progressive: 2, reading: 1 } },
        { key: "none", label: "Aucune / je ne sais pas", weights: { non_prescription: 1 } },
      ],
    },
    {
      key: "wears_glasses",
      sectionKey: "profile",
      label: "Portez-vous des lunettes actuellement ?",
      type: "BOOLEAN",
      options: [
        { key: "yes", label: "Oui", weights: {} },
        { key: "no", label: "Non", weights: {} },
      ],
    },
    {
      key: "strong_correction",
      sectionKey: "profile",
      label: "Votre correction est-elle forte ?",
      helpText: "Verres épais sur les bords, forte réduction/agrandissement des yeux.",
      type: "SINGLE_CHOICE",
      showIf: { any: [{ questionKey: "wears_glasses", op: "eq", value: "yes" }] },
      options: [
        { key: "strong", label: "Oui, assez forte", weights: { "1.67": 2, "1.74": 1, hard_coat: 1 } },
        { key: "moderate", label: "Moyenne", weights: { "1.60": 1 } },
        { key: "light", label: "Légère", weights: { "1.50": 1 } },
        { key: "unknown", label: "Je ne sais pas", weights: {} },
      ],
    },
    // B. USAGE NUMÉRIQUE (Q5–Q8)
    {
      key: "screen_hours",
      sectionKey: "digital",
      label: "Combien d'heures par jour passez-vous devant un écran ?",
      type: "SLIDER",
      config: { min: 0, max: 16, step: 1, unit: "h" },
      options: [],
    },
    {
      key: "computer_use",
      sectionKey: "digital",
      label: "Utilisez-vous un ordinateur régulièrement ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "intensive", label: "Intensivement (travail)", weights: { blue_light_filter: 2, anti_reflective: 2, office: 1 } },
        { key: "moderate", label: "Modérément", weights: { blue_light_filter: 1, anti_reflective: 1 } },
        { key: "rarely", label: "Rarement", weights: {} },
      ],
    },
    {
      key: "smartphone_use",
      sectionKey: "digital",
      label: "Et votre smartphone ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "a_lot", label: "Beaucoup", weights: { blue_light_filter: 1, anti_reflective: 1 } },
        { key: "normal", label: "Normalement", weights: {} },
        { key: "little", label: "Peu", weights: {} },
      ],
    },
    {
      key: "screen_distance",
      sectionKey: "digital",
      label: "À quelle distance travaillez-vous le plus souvent ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "near", label: "De près (lecture, téléphone)", weights: { reading: 1 } },
        { key: "intermediate", label: "Distance intermédiaire (écran)", weights: { office: 1 } },
        { key: "mixed", label: "Un peu de tout", weights: { progressive: 1 } },
      ],
    },
    // C. CONDUITE & ENVIRONNEMENT (Q9–Q12)
    {
      key: "drives",
      sectionKey: "driving",
      label: "Conduisez-vous ?",
      type: "BOOLEAN",
      options: [
        { key: "yes", label: "Oui", weights: { anti_reflective: 1 } },
        { key: "no", label: "Non", weights: {} },
      ],
    },
    {
      key: "night_driving",
      sectionKey: "driving",
      label: "Conduisez-vous de nuit ?",
      type: "SINGLE_CHOICE",
      showIf: { any: [{ questionKey: "drives", op: "eq", value: "yes" }] },
      options: [
        { key: "often", label: "Souvent", weights: { anti_reflective: 3 } },
        { key: "sometimes", label: "Parfois", weights: { anti_reflective: 1 } },
        { key: "never", label: "Jamais", weights: {} },
      ],
    },
    {
      key: "sun_exposure",
      sectionKey: "driving",
      label: "Êtes-vous souvent exposé au soleil ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "very", label: "Très souvent", weights: { photochromic: 2, uv_protection: 2, polarized: 1 } },
        { key: "sometimes", label: "Parfois", weights: { photochromic: 1, uv_protection: 1 } },
        { key: "rarely", label: "Rarement", weights: {} },
      ],
    },
    {
      key: "glare_sensitivity",
      sectionKey: "driving",
      label: "Êtes-vous gêné par les reflets et l'éblouissement ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "yes", label: "Oui, beaucoup", weights: { polarized: 2, anti_reflective: 2 } },
        { key: "somewhat", label: "Un peu", weights: { anti_reflective: 1 } },
        { key: "no", label: "Pas vraiment", weights: {} },
      ],
    },
    // D. MODE DE VIE (Q13–Q16)
    {
      key: "reading",
      sectionKey: "lifestyle",
      label: "Lisez-vous régulièrement (livres, documents) ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "daily", label: "Tous les jours", weights: { reading: 1, anti_reflective: 1 } },
        { key: "sometimes", label: "De temps en temps", weights: {} },
        { key: "rarely", label: "Rarement", weights: {} },
      ],
    },
    {
      key: "sport",
      sectionKey: "lifestyle",
      label: "Pratiquez-vous un sport ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "outdoor", label: "Oui, en extérieur", weights: { polarized: 1, uv_protection: 1, hard_coat: 1 } },
        { key: "indoor", label: "Oui, en intérieur", weights: { hard_coat: 1 } },
        { key: "none", label: "Non", weights: {} },
      ],
    },
    {
      key: "outdoor_time",
      sectionKey: "lifestyle",
      label: "Passez-vous beaucoup de temps en extérieur ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "a_lot", label: "Beaucoup", weights: { photochromic: 2, uv_protection: 1 } },
        { key: "average", label: "Moyennement", weights: { photochromic: 1 } },
        { key: "little", label: "Peu", weights: {} },
      ],
    },
    {
      key: "manual_activities",
      sectionKey: "lifestyle",
      label: "Faites-vous des activités manuelles (bricolage, précision) ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "yes", label: "Oui", weights: { hard_coat: 1, anti_fog: 1 } },
        { key: "no", label: "Non", weights: {} },
      ],
    },
    // E. CONFORT VISUEL (Q17–Q20)
    {
      key: "eye_fatigue",
      sectionKey: "comfort",
      label: "Ressentez-vous de la fatigue visuelle en fin de journée ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "often", label: "Souvent", weights: { blue_light_filter: 2, anti_reflective: 2 } },
        { key: "sometimes", label: "Parfois", weights: { anti_reflective: 1 } },
        { key: "never", label: "Jamais", weights: {} },
      ],
    },
    {
      key: "dryness",
      sectionKey: "comfort",
      label: "Avez-vous les yeux secs ou inconfortables ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "yes", label: "Oui", weights: { blue_light_filter: 1 } },
        { key: "sometimes", label: "Parfois", weights: {} },
        { key: "no", label: "Non", weights: {} },
      ],
    },
    {
      key: "light_sensitivity",
      sectionKey: "comfort",
      label: "Êtes-vous sensible à la lumière ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "very", label: "Très sensible", weights: { photochromic: 2, polarized: 1, uv_protection: 1 } },
        { key: "a_bit", label: "Un peu", weights: { photochromic: 1 } },
        { key: "no", label: "Pas du tout", weights: {} },
      ],
    },
    {
      key: "reflection_discomfort",
      sectionKey: "comfort",
      label: "Les reflets sur vos verres actuels vous dérangent-ils ?",
      type: "SINGLE_CHOICE",
      options: [
        { key: "yes", label: "Oui", weights: { anti_reflective: 2 } },
        { key: "no", label: "Non / je n'ai pas de lunettes", weights: {} },
      ],
    },
  ],
  rules: [
    {
      key: "screens_and_night_driving",
      description: "Usage intensif d'écrans + conduite nocturne → antireflet renforcé.",
      conditions: {
        all: [
          { questionKey: "screen_hours", op: "gte", value: 8 },
          { questionKey: "night_driving", op: "eq", value: "often" },
        ],
      },
      effects: { add: { anti_reflective: 3 }, recommend: ["anti_reflective"] },
    },
    {
      key: "heavy_screens_blue_light",
      description: "Beaucoup d'écrans → filtre lumière bleue.",
      conditions: { all: [{ questionKey: "screen_hours", op: "gte", value: 6 }] },
      effects: { add: { blue_light_filter: 2 }, recommend: ["blue_light_filter", "anti_reflective"] },
    },
    {
      key: "presbyopia_progressive",
      description: "Presbytie → orientation progressifs.",
      conditions: { any: [{ questionKey: "known_correction", op: "eq", value: "presbyopia" }] },
      effects: { add: { progressive: 3 }, recommend: ["progressive"] },
    },
    {
      key: "sun_and_light_sensitivity",
      description: "Exposition soleil + sensibilité lumière → photochromiques.",
      conditions: {
        all: [
          { questionKey: "sun_exposure", op: "eq", value: "very" },
          { questionKey: "light_sensitivity", op: "eq", value: "very" },
        ],
      },
      effects: { add: { photochromic: 3 }, recommend: ["photochromic", "uv_protection"] },
    },
    {
      key: "no_prescription_excludes_index",
      description: "Sans correction → pas de recommandation d'indice.",
      conditions: { any: [{ questionKey: "known_correction", op: "eq", value: "none" }] },
      effects: { exclude: ["1.50", "1.56", "1.59", "1.60", "1.67", "1.74", "progressive"] },
    },
  ],
};

export const DEFAULT_QUIZ: QuizDef = quizSchema.parse(DEFAULT_QUIZ_INPUT);
