"use client";

import { useState, useTransition } from "react";
import { Card, Button, Textarea } from "@optic/ui";
import { addOrderNoteAction } from "../server/actions/orders.js";

/** Internal note editor for an order (§13). */
export function OrderNote({ orderId, note }: { orderId: string; note: string | null }) {
  const [value, setValue] = useState(note ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <Card variant="bordered" padded>
      <h2 className="mb-3 font-heading text-lg font-semibold">Note interne</h2>
      <Textarea value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }} rows={3} aria-label="Note interne" />
      <Button className="mt-2" size="sm" variant="outline" loading={pending} onClick={() => startTransition(async () => { await addOrderNoteAction(orderId, value); setSaved(true); })}>
        {saved ? "Enregistré" : "Enregistrer la note"}
      </Button>
    </Card>
  );
}
