"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "../session.js";
import { audit } from "../audit.js";

/** Quiz Builder actions (§23): toggle questions, edit labels/help, edit option weights. */
export type QuizAdminState = { ok: boolean; error?: string };

export async function toggleQuestionAction(questionId: string, isActive: boolean): Promise<QuizAdminState> {
  const ctx = await requirePermission("quiz:write");
  await ctx.db.quizQuestion.update({ where: { id: questionId } as never, data: { isActive } as never });
  await audit({ action: "quiz.question.toggle", entityType: "QuizQuestion", entityId: questionId, after: { isActive } });
  revalidatePath("/quiz");
  return { ok: true };
}

const questionEditSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(2),
  helpText: z.string().optional().or(z.literal("")),
});

export async function editQuestionAction(input: unknown): Promise<QuizAdminState> {
  const ctx = await requirePermission("quiz:write");
  const parsed = questionEditSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalide" };
  await ctx.db.quizQuestion.update({ where: { id: parsed.data.id } as never, data: { label: parsed.data.label, helpText: parsed.data.helpText || null } as never });
  await audit({ action: "quiz.question.edit", entityType: "QuizQuestion", entityId: parsed.data.id });
  revalidatePath("/quiz");
  return { ok: true };
}

export async function editOptionWeightsAction(optionId: string, weights: Record<string, number>): Promise<QuizAdminState> {
  const ctx = await requirePermission("quiz:write");
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) if (Number.isFinite(v) && v !== 0) clean[k] = Math.round(v);
  await ctx.db.quizOption.update({ where: { id: optionId } as never, data: { weights: clean as never } as never });
  await audit({ action: "quiz.option.weights", entityType: "QuizOption", entityId: optionId });
  revalidatePath("/quiz");
  return { ok: true };
}
