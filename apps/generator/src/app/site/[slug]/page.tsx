import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Package, ShoppingCart, Users, Download } from "lucide-react";
import { prisma } from "@optic/database";
import { Container, Card, Badge, buttonVariants } from "@optic/ui";
import { requirePlatform } from "../../../server/session.js";
import { ExportPanel } from "../../../components/export-panel.js";

export const dynamic = "force-dynamic";

export default async function WebsiteDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ created?: string }> }) {
  const { slug } = await params;
  const { created } = await searchParams;
  await requirePlatform();
  const website = await prisma.website.findUnique({
    where: { slug },
    include: { _count: { select: { products: true, orders: true, customers: true } }, theme: { select: { colors: true } }, exportJobs: { orderBy: { createdAt: "desc" }, take: 3 } },
  });
  if (!website) notFound();
  const colors = (website.theme?.colors as { primary?: string; accent?: string } | undefined) ?? {};
  const storefrontBase = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

  return (
    <Container>
      <div className="py-8">
        <Link href="/" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Tous les sites</Link>

        {created && (
          <div className="mb-6 rounded border border-success/30 bg-success/10 p-4 text-sm text-success">
            ✓ Site créé avec succès. Ajoutez votre catalogue dans l&apos;admin, puis exportez le code source quand vous êtes prêt.
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded" style={{ background: `linear-gradient(135deg, ${colors.primary ?? "#0e5f68"}, ${colors.accent ?? "#c8a24a"})` }} />
            <div>
              <h1 className="font-heading text-2xl font-semibold">{website.name}</h1>
              <p className="text-sm text-muted-foreground">/{website.slug}</p>
            </div>
            <Badge variant={website.status === "ACTIVE" ? "success" : "warning"}>{website.status}</Badge>
          </div>
          <a href={storefrontBase} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}><ExternalLink size={16} /> Prévisualiser</a>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Package size={20} />} label="Produits" value={website._count.products} />
          <Stat icon={<ShoppingCart size={20} />} label="Commandes" value={website._count.orders} />
          <Stat icon={<Users size={20} />} label="Clients" value={website._count.customers} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ExportPanel slug={website.slug} recentJobs={website.exportJobs.map((j) => ({ id: j.id, status: j.status, sizeBytes: j.sizeBytes, createdAt: j.createdAt.toISOString() }))} />

          <Card variant="bordered" padded>
            <h2 className="mb-3 font-heading text-lg font-semibold">Gestion</h2>
            <p className="mb-4 text-sm text-muted-foreground">Chaque site a son propre back-office. Connectez-vous pour gérer le catalogue, les commandes, le contenu et les paramètres.</p>
            <a href={process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"} target="_blank" rel="noreferrer" className={buttonVariants()}>Ouvrir l&apos;admin <ExternalLink size={14} /></a>
          </Card>
        </div>
      </div>
    </Container>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card variant="bordered" padded>
      <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><span className="text-muted-foreground">{icon}</span></div>
      <p className="mt-2 font-heading text-2xl font-semibold">{value}</p>
    </Card>
  );
}
