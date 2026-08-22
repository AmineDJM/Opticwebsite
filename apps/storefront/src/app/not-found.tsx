import Link from "next/link";
import { Container, buttonVariants } from "@optic/ui";
export default function NotFound() {
  return (
    <Container>
      <div className="py-24 text-center">
        <h1 className="font-heading text-5xl font-bold text-primary">404</h1>
        <p className="mt-4 text-muted-foreground">Cette page est introuvable.</p>
        <Link href="/" className={buttonVariants() + " mt-6"}>Retour à l'accueil</Link>
      </div>
    </Container>
  );
}
