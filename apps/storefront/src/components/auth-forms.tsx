"use client";

import { useActionState, useState } from "react";
import { Button, Input, Alert } from "@optic/ui";
import { loginAction, registerAction, type AuthState } from "../server/actions/account.js";

/** Login / register tabbed forms (§14). Server actions with useActionState feedback. */
export function AuthForms() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginState, loginSubmit, loginPending] = useActionState<AuthState, FormData>(loginAction, { ok: false });
  const [regState, regSubmit, regPending] = useActionState<AuthState, FormData>(registerAction, { ok: false });

  return (
    <div className="rounded border border-border bg-surface p-6">
      <div className="mb-6 flex rounded bg-muted p-1">
        <button type="button" onClick={() => setTab("login")} className={`flex-1 rounded py-2 text-sm font-medium ${tab === "login" ? "bg-background shadow" : "text-muted-foreground"}`}>Connexion</button>
        <button type="button" onClick={() => setTab("register")} className={`flex-1 rounded py-2 text-sm font-medium ${tab === "register" ? "bg-background shadow" : "text-muted-foreground"}`}>Créer un compte</button>
      </div>

      {tab === "login" ? (
        <form action={loginSubmit} className="space-y-4">
          {loginState.error && <Alert variant="error">{loginState.error}</Alert>}
          <Input name="email" type="email" label="E-mail" required autoComplete="email" />
          <Input name="password" type="password" label="Mot de passe" required autoComplete="current-password" />
          <Button type="submit" block loading={loginPending}>Se connecter</Button>
        </form>
      ) : (
        <form action={regSubmit} className="space-y-4">
          {regState.error && <Alert variant="error">{regState.error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Input name="firstName" label="Prénom" required autoComplete="given-name" />
            <Input name="lastName" label="Nom" required autoComplete="family-name" />
          </div>
          <Input name="email" type="email" label="E-mail" required autoComplete="email" />
          <Input name="phone" label="Téléphone" required inputMode="tel" autoComplete="tel" />
          <Input name="password" type="password" label="Mot de passe" hint="8 caractères minimum" required autoComplete="new-password" />
          <Button type="submit" block loading={regPending}>Créer mon compte</Button>
        </form>
      )}
    </div>
  );
}
