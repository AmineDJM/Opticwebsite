import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@optic/ui";
import { MANUAL_STEPS } from "@optic/visagism";
import { getTenant } from "../../server/tenant.js";
import { VisagismExperience } from "../../components/visagism-experience.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Visagisme",
  description: "Trouvez les montures faites pour la forme de votre visage.",
};

export default async function VisagismPage() {
  const tenant = await getTenant();
  if (!tenant.features.visagism) redirect("/boutique");

  return (
    <Container>
      <div className="py-8">
        <VisagismExperience
          currency={tenant.currency}
          allowCamera={tenant.features.visagismCamera}
          steps={MANUAL_STEPS}
        />
      </div>
    </Container>
  );
}
