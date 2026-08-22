import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@optic/ui";
import { getTenant } from "../../server/tenant.js";
import { loadQuiz } from "../../server/actions/quiz.js";
import { QuizRunner } from "../../components/quiz-runner.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quiz Verres — L'Opticien virtuel",
  description: "20 questions pour orienter votre choix de verres.",
};

export default async function QuizPage() {
  const tenant = await getTenant();
  if (!tenant.features.lensQuiz) redirect("/boutique");
  const payload = await loadQuiz();
  if (!payload) redirect("/boutique");

  return (
    <Container>
      <div className="py-8">
        <QuizRunner quiz={payload.quiz} />
      </div>
    </Container>
  );
}
