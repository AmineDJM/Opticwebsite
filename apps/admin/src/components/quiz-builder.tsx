"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Save, Eye, EyeOff } from "lucide-react";
import { LENS_TREATMENTS, LENS_DESIGNS, LENS_INDICES } from "@optic/core";
import { Card, Button, Input, Badge, cn } from "@optic/ui";
import { toggleQuestionAction, editQuestionAction, editOptionWeightsAction } from "../server/actions/quiz-admin.js";

/**
 * Quiz Builder (§23). Lists questions grouped by section; each can be toggled, its
 * label/help edited, and each option's scoring weights tuned against the lens buckets.
 * Full CRUD (add/remove questions) is a natural extension; editing covers the common case.
 */
interface Option { id: string; key: string; label: string; weights: Record<string, number> }
interface Question { id: string; key: string; label: string; helpText: string | null; type: string; isActive: boolean; section: { title: string } | null; options: Option[] }

const BUCKETS = [...new Set([...LENS_DESIGNS, ...LENS_TREATMENTS, ...LENS_INDICES])];

export function QuizBuilder({ questions, canEdit }: { questions: Question[]; canEdit: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const sections = [...new Set(questions.map((q) => q.section?.title ?? "Autres"))];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section}>
          <h2 className="mb-2 font-heading text-lg font-semibold">{section}</h2>
          <div className="space-y-2">
            {questions.filter((q) => (q.section?.title ?? "Autres") === section).map((q, i) => (
              <Card key={q.id} variant="bordered" className={cn(!q.isActive && "opacity-60")}>
                <div className="flex items-center justify-between p-3">
                  <button className="flex flex-1 items-center gap-2 text-left" onClick={() => setOpenId(openId === q.id ? null : q.id)}>
                    <Badge variant="neutral">{i + 1}</Badge>
                    <span className="font-medium">{q.label}</span>
                    <ChevronDown size={16} className={cn("ml-auto transition", openId === q.id && "rotate-180")} />
                  </button>
                  {canEdit && (
                    <button onClick={() => startTransition(async () => { await toggleQuestionAction(q.id, !q.isActive); router.refresh(); })} aria-label={q.isActive ? "Désactiver" : "Activer"} className="ml-2 rounded p-1.5 hover:bg-muted">
                      {q.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  )}
                </div>
                {openId === q.id && <QuestionEditor question={q} canEdit={canEdit} />}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionEditor({ question, canEdit }: { question: Question; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(question.label);
  const [help, setHelp] = useState(question.helpText ?? "");

  return (
    <div className="space-y-4 border-t border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Libellé" value={label} onChange={(e) => setLabel(e.target.value)} disabled={!canEdit} />
        <Input label="Aide" value={help} onChange={(e) => setHelp(e.target.value)} disabled={!canEdit} />
      </div>
      {canEdit && (
        <Button size="sm" variant="outline" loading={pending} onClick={() => startTransition(async () => { await editQuestionAction({ id: question.id, label, helpText: help }); router.refresh(); })}>
          <Save size={14} /> Enregistrer le libellé
        </Button>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Réponses &amp; poids de scoring</p>
        <div className="space-y-2">
          {question.options.map((opt) => (
            <OptionWeights key={opt.id} option={opt} canEdit={canEdit} />
          ))}
          {question.options.length === 0 && <p className="text-sm text-muted-foreground">Cette question n&apos;a pas de réponses prédéfinies (numérique/slider).</p>}
        </div>
      </div>
    </div>
  );
}

function OptionWeights({ option, canEdit }: { option: Option; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [weights, setWeights] = useState<Record<string, number>>(option.weights ?? {});
  const [adding, setAdding] = useState(false);

  const active = Object.entries(weights).filter(([, v]) => v);

  return (
    <div className="rounded border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{option.label}</span>
        {canEdit && <button onClick={() => setAdding((v) => !v)} className="text-xs text-primary hover:underline">+ poids</button>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {active.map(([bucket, value]) => (
          <span key={bucket} className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
            {bucket}
            {canEdit ? (
              <input type="number" value={value} onChange={(e) => setWeights({ ...weights, [bucket]: Number(e.target.value) })} className="w-12 rounded border border-border bg-surface px-1 text-xs" />
            ) : <strong>{value}</strong>}
          </span>
        ))}
        {active.length === 0 && <span className="text-xs text-muted-foreground">Aucun poids</span>}
      </div>
      {adding && canEdit && (
        <select onChange={(e) => { if (e.target.value) { setWeights({ ...weights, [e.target.value]: 1 }); setAdding(false); } }} defaultValue="" className="mt-2 rounded border border-border bg-surface px-2 py-1 text-xs">
          <option value="" disabled>Ajouter un bucket…</option>
          {BUCKETS.filter((b) => !(b in weights)).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      )}
      {canEdit && (
        <Button size="sm" variant="ghost" className="mt-2" loading={pending} onClick={() => startTransition(async () => { await editOptionWeightsAction(option.id, weights); router.refresh(); })}>Enregistrer</Button>
      )}
    </div>
  );
}
