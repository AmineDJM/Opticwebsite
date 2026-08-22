import { redirect } from "next/navigation";
import { getAdminContext } from "../../server/session.js";
import { LoginForm } from "../../components/login-form.js";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const ctx = await getAdminContext();
  if (ctx) redirect("/");
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-semibold text-primary">Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour gérer votre boutique.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
