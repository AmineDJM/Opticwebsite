import Link from "next/link";
import { Plus, Globe, Package } from "lucide-react";
import { prisma } from "@optic/database";
import { Container, Card, Badge, buttonVariants } from "@optic/ui";
import { requirePlatform } from "../server/session.js";
import { logoutAction } from "../server/actions/auth.js";

export const dynamic = "force-dynamic";

export default async function GeneratorHome() {
  const ctx = await requirePlatform();
  const websites = await prisma.website.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true, orders: true } }, theme: { select: { colors: true } } },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div>
              <h1 className="font-heading text-xl font-semibold text-primary">Générateur de sites</h1>
              <p className="text-xs text-muted-foreground">One engine → multiple brands</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{ctx.user.name}</span>
              <form action={logoutAction}><button className="text-sm text-muted-foreground hover:text-error">Déconnexion</button></form>
            </div>
          </div>
        </Container>
      </header>

      <Container>
        <div className="py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-semibold">Vos sites <span className="text-base font-normal text-muted-foreground">({websites.length})</span></h2>
            <Link href="/nouveau" className={buttonVariants()}><Plus size={18} /> Nouveau site</Link>
          </div>

          {websites.length === 0 ? (
            <Card variant="bordered" padded className="text-center">
              <Globe className="mx-auto text-muted-foreground" size={40} />
              <p className="mt-3 font-medium">Aucun site pour l&apos;instant</p>
              <p className="mt-1 text-sm text-muted-foreground">Créez votre première enseigne.</p>
              <Link href="/nouveau" className={buttonVariants() + " mt-4"}>Créer un site</Link>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {websites.map((w) => {
                const colors = (w.theme?.colors as { primary?: string; accent?: string } | undefined) ?? {};
                return (
                  <Link key={w.id} href={`/site/${w.slug}`}>
                    <Card variant="bordered" className="overflow-hidden transition hover:border-primary/50">
                      <div className="h-2" style={{ background: `linear-gradient(90deg, ${colors.primary ?? "#0e5f68"}, ${colors.accent ?? "#c8a24a"})` }} />
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-heading font-semibold">{w.name}</h3>
                          <Badge variant={w.status === "ACTIVE" ? "success" : "warning"}>{w.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">/{w.slug}</p>
                        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Package size={14} /> {w._count.products} produits</span>
                          <span>{w._count.orders} commandes</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
