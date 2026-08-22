import { LENS_TREATMENTS, LENS_DESIGNS, LENS_INDICES } from "@optic/core";
import type { QuizScores } from "./engine.js";

/**
 * Turn quiz scores into a product-orientation recommendation (§22). This is guidance,
 * not a prescription: it recommends lens *design*, *treatments* and (only when the
 * answers justify it) an *index*, each with a plain-language reason. Always paired
 * with the disclaimer in the UI.
 */

export interface LensRecommendation {
  design: string | null;
  treatments: string[];
  index: string | null;
  reasons: string[];
  /** Confidence 0..1 based on how strongly the signals pointed one way. */
  confidence: number;
}

const TREATMENT_LABELS: Record<string, string> = {
  anti_reflective: "traitement antireflet",
  hard_coat: "traitement durci anti-rayures",
  uv_protection: "protection UV",
  photochromic: "verres photochromiques",
  polarized: "verres polarisés",
  blue_light_filter: "filtre lumière bleue",
  anti_fog: "traitement antibuée",
  oleophobic: "traitement oléophobe",
};

const DESIGN_LABELS: Record<string, string> = {
  single_vision: "verres unifocaux",
  progressive: "verres progressifs",
  office: "verres de bureau (profondeur intermédiaire)",
  sun_corrective: "verres solaires correcteurs",
  reading: "verres de lecture",
};

/** Pick the highest-scoring key among a candidate set, above a threshold. */
function topKey(scores: Record<string, number>, candidates: readonly string[], threshold = 1): string | null {
  let best: string | null = null;
  let bestScore = threshold - 0.0001;
  for (const c of candidates) {
    const s = scores[c] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

export function buildLensRecommendation(result: QuizScores): LensRecommendation {
  const { scores, recommended, excluded } = result;
  const reasons: string[] = [];

  // Design: the single strongest design bucket.
  const design = topKey(scores, LENS_DESIGNS, 1);

  // Treatments: every treatment above threshold, plus any rule-recommended ones,
  // minus excluded ones. Ordered by score.
  const treatmentScores = LENS_TREATMENTS.map((t) => ({ t, s: scores[t] ?? 0 })).filter(
    (x) => (x.s >= 2 || recommended.includes(x.t)) && !excluded.includes(x.t),
  );
  treatmentScores.sort((a, b) => b.s - a.s);
  const treatments = treatmentScores.map((x) => x.t);

  // Index: only recommend when there is a real signal (high correction / thin-lens
  // preference). Otherwise leave null — do not invent a prescription.
  const index = topKey(scores, LENS_INDICES, 2);

  // Reasons (human, §22 "Pourquoi nous vous le recommandons").
  if (design) reasons.push(`Nous orientons vers des ${DESIGN_LABELS[design] ?? design}.`);
  if (treatments.includes("anti_reflective"))
    reasons.push("Un traitement antireflet réduit la fatigue liée aux écrans et aux reflets nocturnes.");
  if (treatments.includes("blue_light_filter"))
    reasons.push("Un filtre lumière bleue est utile lors d'un usage intensif des écrans.");
  if (treatments.includes("photochromic"))
    reasons.push("Des verres photochromiques s'adaptent à la luminosité intérieure et extérieure.");
  if (treatments.includes("polarized"))
    reasons.push("Des verres polarisés limitent l'éblouissement, utile pour la conduite et l'extérieur.");
  if (treatments.includes("uv_protection"))
    reasons.push("Une protection UV protège vos yeux en extérieur.");
  if (index) reasons.push(`Un indice ${index} permet des verres plus fins et légers selon votre correction.`);

  // Confidence: from total signal strength across chosen buckets.
  const chosenTotal =
    (design ? scores[design] ?? 0 : 0) + treatmentScores.reduce((a, x) => a + x.s, 0) + (index ? scores[index] ?? 0 : 0);
  const confidence = Math.max(0.3, Math.min(0.9, chosenTotal / 25));

  return {
    design,
    treatments,
    index,
    reasons: reasons.slice(0, 4),
    confidence: Math.round(confidence * 100) / 100,
  };
}

export { DESIGN_LABELS, TREATMENT_LABELS };
