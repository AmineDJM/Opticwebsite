import { z } from "zod";

/**
 * Quiz engine types (§20–23). The quiz is administrable data (questions, options,
 * weights, conditional rules), so the engine is a pure evaluator over that data. It
 * scores lens *buckets* (treatments, designs, indices) — never a medical diagnosis.
 */

export const questionTypeSchema = z.enum([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "BOOLEAN",
  "NUMERIC",
  "SLIDER",
  "ICON_CHOICE",
]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

/** A weight map contributes points to named score buckets. */
export const weightsSchema = z.record(z.string(), z.number());
export type Weights = z.infer<typeof weightsSchema>;

export const optionSchema = z.object({
  key: z.string(),
  label: z.string(),
  helpText: z.string().optional(),
  iconKey: z.string().optional(),
  weights: weightsSchema.default({}),
});
export type QuizOptionDef = z.infer<typeof optionSchema>;

/** Condition operators for both rule evaluation and question visibility. */
export const conditionSchema = z.object({
  questionKey: z.string(),
  op: z.enum(["eq", "neq", "gte", "lte", "gt", "lt", "includes", "truthy", "falsy"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
export type Condition = z.infer<typeof conditionSchema>;

export const conditionGroupSchema = z.object({
  all: z.array(conditionSchema).optional(),
  any: z.array(conditionSchema).optional(),
});
export type ConditionGroup = z.infer<typeof conditionGroupSchema>;

export const questionSchema = z.object({
  key: z.string(),
  label: z.string(),
  helpText: z.string().optional(),
  type: questionTypeSchema,
  sectionKey: z.string().optional(),
  isRequired: z.boolean().default(true),
  config: z
    .object({ min: z.number().optional(), max: z.number().optional(), step: z.number().optional(), unit: z.string().optional() })
    .optional(),
  options: z.array(optionSchema).default([]),
  showIf: conditionGroupSchema.optional(),
});
export type QuizQuestionDef = z.infer<typeof questionSchema>;

/** A scoring rule: when conditions hold, apply effects to the scores. */
export const ruleSchema = z.object({
  key: z.string(),
  description: z.string().optional(),
  conditions: conditionGroupSchema,
  effects: z.object({
    add: weightsSchema.optional(),
    recommend: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
  }),
});
export type QuizRuleDef = z.infer<typeof ruleSchema>;

export const sectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
});
export type QuizSectionDef = z.infer<typeof sectionSchema>;

export const quizSchema = z.object({
  key: z.string(),
  name: z.string(),
  disclaimer: z.string().optional(),
  sections: z.array(sectionSchema).default([]),
  questions: z.array(questionSchema),
  rules: z.array(ruleSchema).default([]),
});
export type QuizDef = z.infer<typeof quizSchema>;

/** Raw answers keyed by question key. */
export type Answers = Record<string, string | string[] | number | boolean>;
