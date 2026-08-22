"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Camera, Hand, ArrowLeft, ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";
import { Button, Card, buttonVariants, cn, ProductCard, Spinner, Alert } from "@optic/ui";
import { getVisagismRecommendations, type VisagismResult } from "../server/actions/visagism.js";
import { LinkAdapter, ImageAdapter } from "./next-adapters.js";
import { VisagismCamera } from "./visagism-camera.js";

/**
 * Visagism experience (§15–17). Three entry paths converge on the same engine:
 *   intro → (manual questionnaire | camera analysis) → recommendations.
 * Manual and camera both produce a RecommendationProfile; the server action ranks
 * the catalogue identically. Privacy copy is shown before any camera use.
 */
interface ManualOption { value: string; label: string; description: string; illustration: string }
interface ManualStep { key: string; title: string; help: string; optional: boolean; options: ManualOption[] }

type Stage = "intro" | "manual" | "camera" | "result";

export function VisagismExperience({
  currency,
  allowCamera,
  steps,
}: {
  currency: string;
  allowCamera: boolean;
  steps: ManualStep[];
}) {
  const [stage, setStage] = useState<Stage>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<VisagismResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submitProfile(profile: Record<string, unknown>) {
    startTransition(async () => {
      const res = await getVisagismRecommendations(profile);
      setResult(res);
      setStage("result");
    });
  }

  function finishManual(final: Record<string, string>) {
    submitProfile({ ...final, source: "MANUAL", confidence: 1 });
  }

  function reset() {
    setStage("intro");
    setStepIndex(0);
    setAnswers({});
    setResult(null);
  }

  // ---- Intro ----
  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-heading text-3xl font-semibold md:text-4xl">Visagisme</h1>
        <p className="mt-3 text-muted-foreground">
          Trouvez les montures qui subliment la forme de votre visage. Deux façons de commencer :
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {allowCamera && (
            <Card variant="bordered" padded className="flex flex-col items-center gap-3 text-center">
              <Camera className="text-primary" size={36} strokeWidth={1.4} />
              <h2 className="font-heading text-lg font-semibold">Analyser par photo</h2>
              <p className="text-sm text-muted-foreground">L&apos;analyse se fait dans votre navigateur. Aucune photo n&apos;est envoyée ni conservée.</p>
              <Button className="mt-2" onClick={() => setStage("camera")}>Utiliser la caméra</Button>
            </Card>
          )}
          <Card variant="bordered" padded className="flex flex-col items-center gap-3 text-center">
            <Hand className="text-primary" size={36} strokeWidth={1.4} />
            <h2 className="font-heading text-lg font-semibold">Choisir manuellement</h2>
            <p className="text-sm text-muted-foreground">Sélectionnez la forme de votre visage et vos préférences, sans caméra.</p>
            <Button className="mt-2" variant={allowCamera ? "outline" : "primary"} onClick={() => setStage("manual")}>Commencer</Button>
          </Card>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck size={14} /> Confidentialité garantie — voir notre <Link href="/page/confidentialite" className="underline">politique</Link>.
        </p>
      </div>
    );
  }

  // ---- Camera ----
  if (stage === "camera") {
    return (
      <VisagismCamera
        onCancel={() => setStage("intro")}
        onProfile={(profile, metrics) => submitProfile({ ...profile, source: "AUTOMATIC", metrics })}
      />
    );
  }

  // ---- Manual questionnaire ----
  if (stage === "manual") {
    const step = steps[stepIndex]!;
    const isLast = stepIndex === steps.length - 1;
    const canProceed = !step.optional || answers[step.key];

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <button onClick={() => (stepIndex === 0 ? setStage("intro") : setStepIndex((i) => i - 1))} className="flex items-center gap-1 hover:text-foreground">
              <ArrowLeft size={16} /> Retour
            </button>
            <span>Étape {stepIndex + 1}/{steps.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <h2 className="font-heading text-2xl font-semibold">{step.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{step.help}{step.optional ? " (facultatif)" : ""}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {step.options.map((opt) => {
            const selected = answers[step.key] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [step.key]: opt.value }))}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col items-center gap-2 rounded border-2 p-4 text-center transition",
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <FaceIllustration kind={opt.illustration} selected={selected} />
                <span className="text-sm font-medium">{opt.label}</span>
                {opt.description && <span className="text-xs text-muted-foreground">{opt.description}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-between">
          {step.optional && !answers[step.key] ? (
            <Button variant="ghost" onClick={() => (isLast ? finishManual(answers) : setStepIndex((i) => i + 1))}>Passer</Button>
          ) : (
            <span />
          )}
          <Button
            onClick={() => (isLast ? finishManual(answers) : setStepIndex((i) => i + 1))}
            disabled={!canProceed || pending}
            loading={pending && isLast}
          >
            {isLast ? "Voir mes recommandations" : "Suivant"} <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  // ---- Result ----
  if (pending) return <Spinner label="Analyse en cours…" />;
  if (!result?.ok) {
    return <Alert variant="error">{result?.error ?? "Une erreur est survenue."} <button onClick={reset} className="underline">Recommencer</button></Alert>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-semibold">Vos montures recommandées</h1>
        {result.profile && (
          <p className="mt-2 text-muted-foreground">
            Visage <strong className="capitalize text-foreground">{faceLabel(result.profile.faceShape)}</strong>
            {result.profile.undertone && <> · sous-ton <strong className="text-foreground">{undertoneLabel(result.profile.undertone)}</strong></>}
            {result.profile.source === "AUTOMATIC" && <span className="ml-2 text-xs">(estimation — indicatif)</span>}
          </p>
        )}
      </div>

      {result.recommendations && result.recommendations.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.recommendations.map((r) => (
            <ProductCard
              key={r.id}
              href={`/produit/${r.slug}`}
              currency={currency}
              product={{ id: r.id, slug: r.slug, name: r.name, brandName: r.brandName, priceCents: r.priceCents, comparePriceCents: r.comparePriceCents, imageUrl: r.imageUrl, matchPercent: r.matchPercent, matchReason: r.matchReason }}
              LinkComponent={LinkAdapter}
              ImageComponent={ImageAdapter}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-muted-foreground">Aucune recommandation pour ce profil. Découvrez notre boutique complète.</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={result.catalogueUrl ?? "/boutique"} className={buttonVariants()}>Voir toutes les montures adaptées</Link>
        <Button variant="outline" onClick={reset}><RotateCcw size={16} /> Recommencer</Button>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Cette analyse est une estimation indicative et ne remplace pas l&apos;avis d&apos;un professionnel.
      </p>
    </div>
  );
}

function faceLabel(shape: string): string {
  const l: Record<string, string> = { oval: "ovale", round: "rond", square: "carré", rectangle: "rectangle", heart: "en cœur", diamond: "diamant", triangle: "triangle" };
  return l[shape] ?? shape;
}
function undertoneLabel(u: string): string {
  return u === "warm" ? "chaud" : u === "cool" ? "froid" : "neutre";
}

/** Simple inline SVG illustrations for the manual options (no external assets). */
function FaceIllustration({ kind, selected }: { kind: string; selected: boolean }) {
  const stroke = selected ? "var(--color-primary)" : "var(--color-muted-foreground)";
  const shapes: Record<string, React.ReactNode> = {
    oval: <ellipse cx="24" cy="24" rx="13" ry="17" />,
    round: <circle cx="24" cy="24" r="15" />,
    square: <rect x="10" y="9" width="28" height="30" rx="5" />,
    rectangle: <rect x="12" y="6" width="24" height="36" rx="5" />,
    heart: <path d="M24 42 C10 30 10 14 24 12 C38 14 38 30 24 42 Z" />,
    diamond: <path d="M24 6 L38 24 L24 42 L10 24 Z" />,
    triangle: <path d="M24 8 L36 40 L12 40 Z" />,
  };
  const node = shapes[kind] ?? <circle cx="24" cy="24" r="6" fill={stroke} stroke="none" />;
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="2" aria-hidden="true">
      {node}
    </svg>
  );
}
