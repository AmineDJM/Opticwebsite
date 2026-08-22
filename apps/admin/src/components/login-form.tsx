"use client";
import { useActionState } from "react";
import { Button, Input, Alert, Card } from "@optic/ui";
import { loginAction, type LoginState } from "../server/actions/auth.js";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <Card variant="bordered" padded>
      <form action={action} className="space-y-4">
        {state.error && <Alert variant="error">{state.error}</Alert>}
        <Input name="email" type="email" label="E-mail" required autoComplete="email" autoFocus />
        <Input name="password" type="password" label="Mot de passe" required autoComplete="current-password" />
        <Button type="submit" block loading={pending}>Se connecter</Button>
      </form>
    </Card>
  );
}
