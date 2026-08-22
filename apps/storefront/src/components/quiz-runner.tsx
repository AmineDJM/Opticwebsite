"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, Check, Info } from "lucide-react";
import { Button, buttonVariants, cn, Spinner, Alert, Badge } from "@optic/ui";
import { visibleQuestions, quizProgress, type QuizDef, type Answers } from "@optic/quiz-engine";
import { submitQuiz, type QuizSubmitResult } from "../server/actions/quiz.js";

/**
 * Quiz runner (§20). One question per screen, big touch targets, animated progress,
 * back/next, progress persisted to sessionStorage so a refresh doesn't lose answers.
 * Conditional questions appear/disappear as answers change (engine-driven).
 */
export function QuizRunner({ quiz }: { quiz: QuizDef }) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Restore progress.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`optic_quiz_${quiz.key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers) { setAnswers(parsed.answers); setStarted(true); setIndex(parsed.index ?? 0); }
      }
    } catch { /* ignore */ }
  }, [quiz.key]);

  useEffect(() => {
    if (started) {
      try { sessionStorage.setItem(`optic_quiz_${quiz.key}`, JSON.stringify({ answers, index })); } catch { /* ignore */ }
    }
  }, [answers, index, started, quiz.key]);

  const questions = useMemo(() => visibleQuestions(quiz, answers), [quiz, answers]);
  const progress = quizProgress(quiz, answers);
  const current = questions[Math.min(index, questions.length - 1)];

  function setAnswer(key: string, value: Answers[string]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function next() {
    if (index < questions.length - 1) setIndex((i) => i + 1);
    else finish();
  }

  function finish() {
    startTransition(async () => {
      const res = await submitQuiz(answers, true);
      setResult(res);
      try { sessionStorage.removeItem(`optic_quiz_${quiz.key}`); } catch { /* ignore */ }
    });
  }

  function reset() {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setStarted(false);
  }

  // ---- Intro ----
  if (!started && !result) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">L&apos;Opticien virtuel</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold md:text-4xl">{quiz.name}</h1>
        <p className="mt-3 text-muted-foreground">20 questions pour orienter votre choix de verres. Cela prend 2 minutes.</p>
        <Button size="lg" className="mt-8" onClick={() => setStarted(true)}>Commencer le quiz</Button>
        {quiz.disclaimer && (
          <p className="mt-6 flex items-start gap-2 text-left text-xs text-muted-foreground">
            <Info size={14} className="mt-0.5 shrink-0" /> {quiz.disclaimer}
          </p>
        )}
      </div>
    );
  }

  // ---- Result ----
  if (result) {
    if (pending) return <Spinner label="Analyse de vos réponses…" />;
    if (!result.ok || !result.recommendation) {
      return <Alert variant="error">{result.error ?? "Erreur"} <button onClick={reset} className="underline">Recommencer</button></Alert>;
    }
    const rec = result.recommendation;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <Check className="mx-auto text-success" size={44} />
          <h1 className="mt-3 font-heading text-3xl font-semibold">Votre recommandation</h1>
        </div>

        <div className="mt-6 space-y-4">
          {rec.design && <RecoCard title="Type de verres" value={designLabel(rec.design)} />}
          {rec.treatments.length > 0 && (
            <div className="rounded border border-border bg-surface p-5">
              <h2 className="text-sm font-medium text-muted-foreground">Traitements conseillés</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {rec.treatments.map((t) => <Badge key={t} variant="primary">{treatmentLabel(t)}</Badge>)}
              </div>
            </div>
          )}
          {rec.index && <RecoCard title="Indice suggéré" value={rec.index} hint="Selon votre correction — à confirmer avec un opticien." />}
        </div>

        {rec.reasons.length > 0 && (
          <div className="mt-6 rounded bg-primary/5 p-5">
            <h2 className="font-heading font-semibold text-foreground">Pourquoi nous vous le recommandons</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {rec.reasons.map((r, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span> {r}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={result.productsUrl ?? "/boutique"} className={buttonVariants()}>Voir les produits adaptés</Link>
          <Button variant="outline" onClick={reset}><RotateCcw size={16} /> Recommencer</Button>
        </div>

        {result.disclaimer && (
          <p className="mt-6 rounded bg-muted p-3 text-xs text-muted-foreground">{result.disclaimer}</p>
        )}
      </div>
    );
  }

  if (!current) return <Spinner />;

  // ---- Question ----
  const answered = answers[current.key] !== undefined && answers[current.key] !== "";
  const canProceed = !current.isRequired || answered;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <button onClick={() => (index === 0 ? reset() : setIndex((i) => i - 1))} className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft size={16} /> {index === 0 ? "Quitter" : "Précédent"}
          </button>
          <span>Question {progress.answered + (answered ? 0 : 1)}/{progress.total} — {progress.percent}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <div key={current.key} className="animate-slide-up">
        <h2 className="font-heading text-2xl font-semibold">{current.label}</h2>
        {current.helpText && <p className="mt-1 text-sm text-muted-foreground">{current.helpText}</p>}

        <div className="mt-6">
          <QuestionInput question={current} value={answers[current.key]} onChange={(v) => setAnswer(current.key, v)} />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={next} disabled={!canProceed || pending} loading={pending}>
          {index >= questions.length - 1 ? "Voir ma recommandation" : "Suivant"} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }: { question: QuizDef["questions"][number]; value: Answers[string] | undefined; onChange: (v: Answers[string]) => void }) {
  if (question.type === "BOOLEAN") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[{ k: "yes", l: "Oui" }, { k: "no", l: "Non" }].map((o) => (
          <OptionButton key={o.k} label={o.l} selected={value === o.k} onClick={() => onChange(o.k)} />
        ))}
      </div>
    );
  }
  if (question.type === "NUMERIC" || question.type === "SLIDER") {
    const cfg = (question.config ?? {}) as { min?: number; max?: number; step?: number; unit?: string };
    const min = cfg.min ?? 0;
    const max = cfg.max ?? 16;
    const num = typeof value === "number" ? value : Math.round((min + max) / 2);
    return (
      <div className="rounded border border-border p-6 text-center">
        <output className="font-heading text-4xl font-semibold text-primary">{num}{cfg.unit ? ` ${cfg.unit}` : ""}</output>
        <input
          type="range"
          min={min}
          max={max}
          step={cfg.step ?? 1}
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-4 w-full accent-[var(--color-primary)]"
          aria-label={question.label}
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{min}</span><span>{max}</span></div>
      </div>
    );
  }
  if (question.type === "MULTIPLE_CHOICE") {
    const arr = Array.isArray(value) ? value : [];
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((o) => (
          <OptionButton
            key={o.key}
            label={o.label}
            help={o.helpText}
            selected={arr.includes(o.key)}
            onClick={() => onChange(arr.includes(o.key) ? arr.filter((x) => x !== o.key) : [...arr, o.key])}
          />
        ))}
      </div>
    );
  }
  // SINGLE_CHOICE / ICON_CHOICE
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {question.options.map((o) => (
        <OptionButton key={o.key} label={o.label} help={o.helpText} selected={value === o.key} onClick={() => onChange(o.key)} />
      ))}
    </div>
  );
}

function OptionButton({ label, help, selected, onClick }: { label: string; help?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center justify-between gap-3 rounded border-2 p-4 text-left transition",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      <span>
        <span className="block font-medium">{label}</span>
        {help && <span className="block text-xs text-muted-foreground">{help}</span>}
      </span>
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
        {selected && <Check size={12} />}
      </span>
    </button>
  );
}

function RecoCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-border bg-surface p-5">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <p className="mt-1 font-heading text-xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function designLabel(d: string): string {
  const l: Record<string, string> = { single_vision: "Verres unifocaux", progressive: "Verres progressifs", office: "Verres de bureau", sun_corrective: "Verres solaires correcteurs", reading: "Verres de lecture" };
  return l[d] ?? d;
}
function treatmentLabel(t: string): string {
  const l: Record<string, string> = { anti_reflective: "Antireflet", hard_coat: "Anti-rayures", uv_protection: "Protection UV", photochromic: "Photochromique", polarized: "Polarisé", blue_light_filter: "Filtre lumière bleue", anti_fog: "Antibuée", oleophobic: "Oléophobe" };
  return l[t] ?? t;
}
