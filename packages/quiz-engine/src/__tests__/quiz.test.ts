import { describe, it, expect } from "vitest";
import { scoreQuiz, visibleQuestions, isQuestionVisible, quizProgress, evalConditionGroup } from "../engine";
import { buildLensRecommendation } from "../recommendation";
import { DEFAULT_QUIZ } from "../default-quiz";
import { quizSchema, type Answers } from "../types";

describe("default quiz definition", () => {
  it("has 20 questions across 5 sections", () => {
    expect(DEFAULT_QUIZ.questions).toHaveLength(20);
    expect(DEFAULT_QUIZ.sections).toHaveLength(5);
  });
  it("is schema-valid", () => {
    expect(quizSchema.safeParse(DEFAULT_QUIZ).success).toBe(true);
  });
  it("carries a medical disclaimer", () => {
    expect(DEFAULT_QUIZ.disclaimer).toMatch(/professionnel/i);
  });
});

describe("conditional visibility", () => {
  it("hides night-driving unless the user drives", () => {
    const q = DEFAULT_QUIZ.questions.find((x) => x.key === "night_driving")!;
    expect(isQuestionVisible(q, { drives: "no" })).toBe(false);
    expect(isQuestionVisible(q, { drives: "yes" })).toBe(true);
  });
  it("filters visible questions", () => {
    const all = visibleQuestions(DEFAULT_QUIZ, {});
    const withDriving = visibleQuestions(DEFAULT_QUIZ, { drives: "yes" });
    expect(withDriving.length).toBeGreaterThan(all.length);
  });
});

describe("scoring", () => {
  it("accumulates option weights", () => {
    const answers: Answers = { computer_use: "intensive" };
    const { scores } = scoreQuiz(DEFAULT_QUIZ, answers);
    expect(scores.blue_light_filter).toBeGreaterThanOrEqual(2);
    expect(scores.anti_reflective).toBeGreaterThanOrEqual(2);
  });

  it("applies the screens + night-driving rule (§23 example)", () => {
    const answers: Answers = { drives: "yes", screen_hours: 9, night_driving: "often" };
    const { scores, firedRules } = scoreQuiz(DEFAULT_QUIZ, answers);
    expect(firedRules).toContain("screens_and_night_driving");
    // 3 (option) + 3 (rule) at least
    expect(scores.anti_reflective).toBeGreaterThanOrEqual(6);
  });

  it("excludes index buckets when no correction", () => {
    const answers: Answers = { known_correction: "none" };
    const { excluded } = scoreQuiz(DEFAULT_QUIZ, answers);
    expect(excluded).toContain("1.67");
    expect(excluded).toContain("progressive");
  });

  it("orients presbyopia towards progressive", () => {
    const { scores, recommended } = scoreQuiz(DEFAULT_QUIZ, { known_correction: "presbyopia" });
    expect(scores.progressive).toBeGreaterThanOrEqual(3);
    expect(recommended).toContain("progressive");
  });
});

describe("lens recommendation", () => {
  it("recommends anti-reflective for a heavy-screen night-driver with reasons", () => {
    const answers: Answers = { drives: "yes", screen_hours: 10, night_driving: "often", computer_use: "intensive" };
    const rec = buildLensRecommendation(scoreQuiz(DEFAULT_QUIZ, answers));
    expect(rec.treatments).toContain("anti_reflective");
    expect(rec.reasons.some((r) => /antireflet/i.test(r))).toBe(true);
    expect(rec.confidence).toBeGreaterThan(0);
  });

  it("does not recommend an index when no correction is known", () => {
    const rec = buildLensRecommendation(scoreQuiz(DEFAULT_QUIZ, { known_correction: "none" }));
    expect(rec.index).toBeNull();
  });

  it("recommends progressive design for presbyopia", () => {
    const rec = buildLensRecommendation(scoreQuiz(DEFAULT_QUIZ, { known_correction: "presbyopia" }));
    expect(rec.design).toBe("progressive");
  });
});

describe("progress", () => {
  it("computes answered/total/percent over visible questions", () => {
    const answers: Answers = { age_range: "25_40", known_correction: "myopia" };
    const p = quizProgress(DEFAULT_QUIZ, answers);
    expect(p.answered).toBe(2);
    expect(p.total).toBeGreaterThanOrEqual(18);
    expect(p.percent).toBeGreaterThan(0);
  });
});

describe("condition groups", () => {
  it("evaluates all/any correctly", () => {
    expect(evalConditionGroup({ all: [{ questionKey: "a", op: "eq", value: 1 }] }, { a: 1 })).toBe(true);
    expect(evalConditionGroup({ any: [{ questionKey: "a", op: "gte", value: 5 }] }, { a: 3 })).toBe(false);
    expect(evalConditionGroup({ all: [{ questionKey: "a", op: "truthy" }] }, { a: "x" })).toBe(true);
  });
});
