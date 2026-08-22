import { Container } from "@optic/ui";
export const dynamic = "force-dynamic";
export default function Placeholder() {
  return (
    <Container>
      <div className="py-24 text-center">
        <h1 className="font-heading text-3xl font-semibold">suivi</h1>
        <p className="mt-2 text-muted-foreground">En construction.</p>
      </div>
    </Container>
  );
}
