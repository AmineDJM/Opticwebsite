"use client";

import { useState } from "react";
import { Button, Input } from "@optic/ui";

/** Newsletter island (§45.15). Posts to a server action route; shows success/error. */
export function NewsletterForm({ subscribeLabel, className }: { subscribeLabel: string; className?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "ok" : "error");
      if (res.ok) setEmail("");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return <p className={className + " text-sm text-success"}>Merci, vous êtes inscrit !</p>;
  }

  return (
    <form onSubmit={submit} className={"flex flex-col gap-2 sm:flex-row " + (className ?? "")}>
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.com"
        aria-label="Adresse e-mail"
        error={state === "error" ? "Réessayez" : undefined}
        className="flex-1"
      />
      <Button type="submit" loading={state === "loading"}>{subscribeLabel}</Button>
    </form>
  );
}
