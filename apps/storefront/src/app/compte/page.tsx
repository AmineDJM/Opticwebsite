import type { Metadata } from "next";
import Link from "next/link";
import { Package, User, LogOut } from "lucide-react";
import { Container, Card, buttonVariants } from "@optic/ui";
import { formatMoney } from "@optic/core";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@optic/commerce";
import { getTenant } from "../../server/tenant.js";
import { getCustomer } from "../../server/auth.js";
import { getMyOrders, logoutAction } from "../../server/actions/account.js";
import { AuthForms } from "../../components/auth-forms.js";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const tenant = await getTenant();
  if (!tenant.features.accounts) {
    return (
      <Container>
        <div className="py-24 text-center">
          <h1 className="font-heading text-2xl font-semibold">Suivi de commande</h1>
          <p className="mt-2 text-muted-foreground">Retrouvez votre commande avec son numéro.</p>
          <Link href="/suivi" className={buttonVariants() + " mt-6"}>Suivre ma commande</Link>
        </div>
      </Container>
    );
  }

  const customer = await getCustomer();

  if (!customer) {
    return (
      <Container>
        <div className="mx-auto max-w-md py-12">
          <h1 className="mb-6 text-center font-heading text-3xl font-semibold">Mon compte</h1>
          <AuthForms />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas envie de créer un compte ? <Link href="/suivi" className="text-primary hover:underline">Suivez votre commande</Link> avec son numéro.
          </p>
        </div>
      </Container>
    );
  }

  const orders = (await getMyOrders()) as never as {
    id: string; number: string; status: OrderStatus; totalCents: number; createdAt: Date; items: { name: string; quantity: number }[];
  }[];

  return (
    <Container>
      <div className="py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-3xl font-semibold">Bonjour, {customer.firstName}</h1>
          <form action={logoutAction}>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-error"><LogOut size={16} /> Se déconnecter</button>
          </form>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card variant="bordered" padded className="h-fit">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><User size={22} /></div>
              <div>
                <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                <p className="text-sm text-muted-foreground">{customer.email ?? customer.phone}</p>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-semibold"><Package size={20} /> Mes commandes</h2>
            {orders.length === 0 ? (
              <p className="text-muted-foreground">Vous n&apos;avez pas encore de commande.</p>
            ) : (
              <ul className="space-y-3">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/commande/${o.number}`} className="flex items-center justify-between rounded border border-border p-4 transition hover:border-primary/50">
                      <div>
                        <p className="font-mono text-sm font-medium">{o.number}</p>
                        <p className="text-xs text-muted-foreground">{o.items.length} article(s) • {ORDER_STATUS_LABELS[o.status]}</p>
                      </div>
                      <span className="font-semibold">{formatMoney(o.totalCents, tenant.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
