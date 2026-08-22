"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@optic/ui";

/** Guest order tracking by number (§14). */
export function TrackForm({ defaultNumber }: { defaultNumber: string }) {
  const [number, setNumber] = useState(defaultNumber);
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (number.trim()) router.push(`/suivi?number=${encodeURIComponent(number.trim())}`); }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <Input value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="Ex : AURA-260822-K7Q3F" aria-label="Numéro de commande" className="flex-1" />
      <Button type="submit">Rechercher</Button>
    </form>
  );
}
