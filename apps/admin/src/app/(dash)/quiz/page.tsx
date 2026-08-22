import { requirePermission } from "../../../server/session.js";
import { QuizBuilder } from "../../../components/quiz-builder.js";

export const dynamic = "force-dynamic";

export default async function QuizAdminPage() {
  const ctx = await requirePermission("quiz:read");
  const quiz = await ctx.db.quiz.findFirst({
    where: { isActive: true } as never,
    include: {
      sections: { orderBy: { position: "asc" } },
      questions: { orderBy: { position: "asc" }, include: { options: { orderBy: { position: "asc" } }, section: { select: { key: true, title: true } } } },
    },
  });
  if (!quiz) return <p className="text-muted-foreground">Aucun quiz configuré.</p>;
  const q = quiz as never as {
    name: string; disclaimer: string | null;
    questions: { id: string; key: string; label: string; helpText: string | null; type: string; isActive: boolean; section: { title: string } | null; options: { id: string; key: string; label: string; weights: Record<string, number> }[] }[];
  };
  const canEdit = ctx.permissions.includes("*") || ctx.permissions.includes("quiz:write");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Quiz Verres — {q.name}</h1>
        <p className="text-sm text-muted-foreground">{q.questions.length} questions. Activez/désactivez, modifiez les libellés et les poids de scoring.</p>
      </div>
      <QuizBuilder canEdit={canEdit} questions={q.questions} />
      {q.disclaimer && <p className="rounded bg-muted p-3 text-xs text-muted-foreground">Avertissement affiché aux clients : {q.disclaimer}</p>}
    </div>
  );
}
