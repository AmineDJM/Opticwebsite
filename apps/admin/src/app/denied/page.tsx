import Link from "next/link";
import { buttonVariants } from "@optic/ui";
export default function Denied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="font-heading text-2xl font-semibold">Accès refusé</h1>
      <p className="text-muted-foreground">Vous n&apos;avez pas la permission d&apos;accéder à cette section.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>Retour au tableau de bord</Link>
    </div>
  );
}
