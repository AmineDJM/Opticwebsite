import type { Answers, Condition, ConditionGroup, QuizDef, QuizQuestionDef, Weights } from "./types.js";

/**
 * Quiz evaluation engine (§22–23). Pure: (quiz definition, answers) → scores +
 * a product-orientation recommendation with human reasons. Conditional visibility
 * and conditional scoring rules are both data-driven.
 */

function evalCondition(cond: Condition, answers: Answers): boolean {
  const answer = answers[cond.questionKey];
  switch (cond.op) {
    case "truthy":
      return !!answer;
    case "falsy":
      return !answer;
    case "eq":
      return answer === cond.value;
    case "neq":
      return answer !== cond.value;
    case "gte":
      return typeof answer === "number" && typeof cond.value === "number" && answer >= cond.value;
    case "lte":
      return typeof answer === "number" && typeof cond.value === "number" && answer <= cond.value;
    case "gt":
      return typeof answer === "number" && typeof cond.value === "number" && answer > cond.value;
    case "lt":
      return typeof answer === "number" && typeof cond.value === "number" && answer < cond.value;
    case "includes":
      return Array.isArray(answer) && answer.includes(cond.value as string);
    default:
      return false;
  }
}

export function evalConditionGroup(group: ConditionGroup, answers: Answers): boolean {
  const all = group.all ? group.all.every((c) => evalCondition(c, answers)) : true;
  const any = group.any ? group.any.some((c) => evalCondition(c, answers)) : true;
  return all && any;
}

/** Is a question visible given current answers (its `showIf` group)? */
export function isQuestionVisible(question: QuizQuestionDef, answers: Answers): boolean {
  return question.showIf ? evalConditionGroup(question.showIf, answers) : true;
}

/** The ordered list of currently-visible questions (drives one-per-screen flow). */
export function visibleQuestions(quiz: QuizDef, answers: Answers): QuizQuestionDef[] {
  return quiz.questions.filter((q) => isQuestionVisible(q, answers));
}

function addWeights(target: Record<string, number>, weights: Weights, factor = 1): void {
  for (const [k, v] of Object.entries(weights)) {
    target[k] = (target[k] ?? 0) + v * factor;
  }
}

export interface QuizScores {
  scores: Record<string, number>;
  recommended: string[];
  excluded: string[];
  firedRules: string[];
}

/** Accumulate raw option weights, then apply conditional rules. */
export function scoreQuiz(quiz: QuizDef, answers: Answers): QuizScores {
  const scores: Record<string, number> = {};
  const recommended = new Set<string>();
  const excluded = new Set<string>();
  const firedRules: string[] = [];

  // 1. Option weights.
  for (const question of quiz.questions) {
    if (!isQuestionVisible(question, answers)) continue;
    const answer = answers[question.key];
    if (answer === undefined || answer === null) continue;

    const selectedKeys = Array.isArray(answer)
      ? answer
      : typeof answer === "boolean"
        ? [answer ? "yes" : "no"]
        : [String(answer)];

    for (const opt of question.options) {
      if (selectedKeys.includes(opt.key)) addWeights(scores, opt.weights);
    }
  }

  // 2. Conditional rules.
  for (const rule of quiz.rules) {
    if (!evalConditionGroup(rule.conditions, answers)) continue;
    firedRules.push(rule.key);
    if (rule.effects.add) addWeights(scores, rule.effects.add);
    for (const r of rule.effects.recommend ?? []) recommended.add(r);
    for (const e of rule.effects.exclude ?? []) excluded.add(e);
  }

  // Excluded buckets are removed from scores and never recommended.
  for (const e of excluded) {
    delete scores[e];
    recommended.delete(e);
  }

  return {
    scores,
    recommended: [...recommended],
    excluded: [...excluded],
    firedRules,
  };
}

export interface QuizProgress {
  answered: number;
  total: number;
  percent: number;
  currentIndex: number;
}

/** Progress against currently-visible questions (§20 "Question 12/20 — 60%"). */
export function quizProgress(quiz: QuizDef, answers: Answers): QuizProgress {
  const visible = visibleQuestions(quiz, answers);
  const answered = visible.filter((q) => {
    const a = answers[q.key];
    return a !== undefined && a !== null && !(Array.isArray(a) && a.length === 0);
  }).length;
  const total = visible.length;
  const currentIndex = Math.min(answered, Math.max(0, total - 1));
  return { answered, total, percent: total === 0 ? 0 : Math.round((answered / total) * 100), currentIndex };
}
