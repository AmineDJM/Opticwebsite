"use server";

import { scoreQuiz, buildLensRecommendation, quizSchema, type QuizDef, type Answers } from "@optic/quiz-engine";
import { getTenant } from "../tenant.js";

/**
 * Quiz server action (§22). Loads the admin-configured quiz from the DB, scores the
 * submitted answers through the pure engine, builds a lens recommendation with human
 * reasons, and (optionally) persists the anonymous result. The disclaimer is always
 * returned so the UI can show it.
 */

export interface QuizPayload {
  quiz: QuizDef;
}

/** Load the active quiz definition from the tenant's DB, shaped for the engine. */
export async function loadQuiz(): Promise<QuizPayload | null> {
  const tenant = await getTenant();
  if (!tenant.features.lensQuiz) return null;

  const quiz = await tenant.db.quiz.findFirst({
    where: { isActive: true } as never,
    include: {
      sections: { orderBy: { position: "asc" } },
      questions: {
        where: { isActive: true } as never,
        orderBy: { position: "asc" },
        include: { options: { orderBy: { position: "asc" } }, section: { select: { key: true } } },
      },
      rules: { where: { isActive: true } as never, orderBy: { position: "asc" } },
    },
  });
  if (!quiz) return null;

  const q = quiz as never as {
    key: string;
    name: string;
    disclaimer: string | null;
    sections: { key: string; title: string; subtitle: string | null }[];
    questions: Array<{
      key: string; label: string; helpText: string | null; type: string; isRequired: boolean;
      config: unknown; showIf: unknown; section: { key: string } | null;
      options: { key: string; label: string; helpText: string | null; iconKey: string | null; weights: unknown }[];
    }>;
    rules: { key: string; description: string | null; conditions: unknown; effects: unknown }[];
  };

  const def = {
    key: q.key,
    name: q.name,
    disclaimer: q.disclaimer ?? undefined,
    sections: q.sections.map((s) => ({ key: s.key, title: s.title, subtitle: s.subtitle ?? undefined })),
    questions: q.questions.map((question) => ({
      key: question.key,
      label: question.label,
      helpText: question.helpText ?? undefined,
      type: question.type,
      sectionKey: question.section?.key,
      isRequired: question.isRequired,
      config: question.config ?? undefined,
      showIf: question.showIf ?? undefined,
      options: question.options.map((o) => ({ key: o.key, label: o.label, helpText: o.helpText ?? undefined, iconKey: o.iconKey ?? undefined, weights: (o.weights as Record<string, number>) ?? {} })),
    })),
    rules: q.rules.map((r) => ({ key: r.key, description: r.description ?? undefined, conditions: r.conditions, effects: r.effects })),
  };

  const parsed = quizSchema.safeParse(def);
  if (!parsed.success) return null;
  return { quiz: parsed.data };
}

export interface QuizSubmitResult {
  ok: boolean;
  error?: string;
  recommendation?: {
    design: string | null;
    treatments: string[];
    index: string | null;
    reasons: string[];
    confidence: number;
  };
  disclaimer?: string;
  productsUrl?: string;
}

export async function submitQuiz(answers: Answers, save = false): Promise<QuizSubmitResult> {
  const tenant = await getTenant();
  const payload = await loadQuiz();
  if (!payload) return { ok: false, error: "Quiz indisponible" };

  const scores = scoreQuiz(payload.quiz, answers);
  const recommendation = buildLensRecommendation(scores);

  if (save) {
    try {
      const quizRow = await tenant.db.quiz.findFirst({ where: { key: payload.quiz.key } as never, select: { id: true } });
      if (quizRow) {
        await tenant.db.quizResult.create({
          data: {
            quizId: (quizRow as { id: string }).id,
            answers: answers as never,
            scores: scores.scores as never,
            recommendation: recommendation as never,
          } as never,
        });
      }
    } catch { /* non-fatal */ }
  }

  // Suggest sunglasses/relevant products when the recommendation leans that way.
  const productsUrl = recommendation.treatments.includes("polarized") || recommendation.design === "sun_corrective"
    ? "/categorie/solaires"
    : "/boutique";

  return { ok: true, recommendation, disclaimer: payload.quiz.disclaimer, productsUrl };
}
